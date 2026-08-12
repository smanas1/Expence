import mongoose from "mongoose";
import { Router } from "express";

import { ensureRecordsBackfilledForUser, normalizeRecordPayload, serializeRecord } from "../lib/records.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { RecordModel } from "../models/Record.js";
import { TransactionModel } from "../models/Transaction.js";

export const recordsRouter = Router();

recordsRouter.use(async (req: AuthedRequest, _res, next) => {
  await ensureRecordsBackfilledForUser(new mongoose.Types.ObjectId(req.userId));
  next();
});

recordsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const records = await RecordModel.aggregate<{
    _id: mongoose.Types.ObjectId;
    name: string;
    note: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
    totalIncome: number;
    totalExpense: number;
    entryCount: number;
    lastActivityAt: Date | null;
  }>([
    { $match: { userId } },
    {
      $lookup: {
        from: "transactions",
        let: { recordId: "$_id", userId: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$recordId", "$$recordId"] },
                  { $eq: ["$userId", "$$userId"] },
                  { $in: ["$kind", ["income", "expense"]] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalIncome: {
                $sum: {
                  $cond: [{ $eq: ["$kind", "income"] }, "$amount", 0],
                },
              },
              totalExpense: {
                $sum: {
                  $cond: [{ $and: [{ $eq: ["$kind", "expense"] }, { $ne: [{ $ifNull: ["$expenseStatus", "realized"] }, "unrealized"] }] }, "$amount", 0],
                },
              },
              entryCount: { $sum: 1 },
              lastActivityAt: { $max: "$occurredAt" },
            },
          },
        ],
        as: "stats",
      },
    },
    {
      $project: {
        name: 1,
        note: 1,
        color: 1,
        createdAt: 1,
        updatedAt: 1,
        totalIncome: { $ifNull: [{ $arrayElemAt: ["$stats.totalIncome", 0] }, 0] },
        totalExpense: { $ifNull: [{ $arrayElemAt: ["$stats.totalExpense", 0] }, 0] },
        entryCount: { $ifNull: [{ $arrayElemAt: ["$stats.entryCount", 0] }, 0] },
        lastActivityAt: { $ifNull: [{ $arrayElemAt: ["$stats.lastActivityAt", 0] }, null] },
      },
    },
    { $sort: { updatedAt: -1, createdAt: -1 } },
  ]);

  res.json({
    records: records.map((record) => ({
      ...serializeRecord(record),
      totalIncome: record.totalIncome,
      totalExpense: record.totalExpense,
      balance: record.totalIncome - record.totalExpense,
      entryCount: record.entryCount,
      lastActivityAt: record.lastActivityAt ? new Date(record.lastActivityAt).toISOString() : null,
    })),
  });
});

recordsRouter.post("/", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const payload = normalizeRecordPayload(req.body ?? {});

  if (!payload.name) {
    res.status(400).json({ message: "Record name is required." });
    return;
  }

  const record = await RecordModel.create({
    userId,
    ...payload,
  });

  res.status(201).json({ record: serializeRecord(record.toObject()) });
});

recordsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const recordId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    res.status(404).json({ message: "Record not found." });
    return;
  }

  const recordObjectId = new mongoose.Types.ObjectId(recordId);
  const record = await RecordModel.findOne({ _id: recordObjectId, userId }).lean();

  if (!record) {
    res.status(404).json({ message: "Record not found." });
    return;
  }

  const [recentTransactions, aggregates] = await Promise.all([
    TransactionModel.find({
      userId,
      recordId: recordObjectId,
      kind: { $in: ["income", "expense"] },
    })
      .sort({ occurredAt: -1 })
      .lean(),
    TransactionModel.aggregate<{
      totals: Array<{ _id: null; totalIncome: number; totalExpense: number }>;
      categories: Array<{ _id: string; income: number; expense: number; total: number }>;
    }>([
      { $match: { userId, recordId: recordObjectId, kind: { $in: ["income", "expense"] } } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalIncome: {
                  $sum: {
                    $cond: [{ $eq: ["$kind", "income"] }, "$amount", 0],
                  },
                },
                totalExpense: {
                  $sum: {
                    $cond: [{ $and: [{ $eq: ["$kind", "expense"] }, { $ne: [{ $ifNull: ["$expenseStatus", "realized"] }, "unrealized"] }] }, "$amount", 0],
                  },
                },
              },
            },
          ],
          categories: [
            {
              $group: {
                _id: { $ifNull: ["$category", "Uncategorized"] },
                income: {
                  $sum: {
                    $cond: [{ $eq: ["$kind", "income"] }, "$amount", 0],
                  },
                },
                expense: {
                  $sum: {
                    $cond: [{ $and: [{ $eq: ["$kind", "expense"] }, { $ne: [{ $ifNull: ["$expenseStatus", "realized"] }, "unrealized"] }] }, "$amount", 0],
                  },
                },
                total: { $sum: "$amount" },
              },
            },
            { $sort: { total: -1, _id: 1 } },
          ],
        },
      },
    ]),
  ]);

  const aggregate = aggregates[0];
  const totals = aggregate?.totals?.[0] ?? { totalIncome: 0, totalExpense: 0 };
  const categoryBreakdown = (aggregate?.categories ?? []).map((item: { _id: string; income: number; expense: number; total: number }) => ({
    category: item._id || "Uncategorized",
    income: item.income,
    expense: item.expense,
    total: item.total,
  }));

  res.json({
    record: {
      ...serializeRecord(record),
      totalIncome: totals.totalIncome,
      totalExpense: totals.totalExpense,
      balance: totals.totalIncome - totals.totalExpense,
      recentTransactions: recentTransactions.map((transaction) => ({
        _id: String(transaction._id),
        title: transaction.title,
        amount: transaction.amount,
        category: transaction.category ?? "",
        section: transaction.section ?? "self",
        kind: transaction.kind,
        expenseStatus: transaction.expenseStatus ?? "realized",
        occurredAt: transaction.occurredAt instanceof Date ? transaction.occurredAt.toISOString() : new Date(transaction.occurredAt).toISOString(),
        recordId: transaction.recordId ? String(transaction.recordId) : null,
      })),
      categoryBreakdown,
    },
  });
});

recordsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const recordId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const payload = normalizeRecordPayload(req.body ?? {});

  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    res.status(404).json({ message: "Record not found." });
    return;
  }

  if (!payload.name) {
    res.status(400).json({ message: "Record name is required." });
    return;
  }

  const record = await RecordModel.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(recordId), userId },
    { $set: payload },
    { returnDocument: "after" },
  ).lean();

  if (!record) {
    res.status(404).json({ message: "Record not found." });
    return;
  }

  res.json({ record: serializeRecord(record) });
});

recordsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const recordId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    res.status(404).json({ message: "Record not found." });
    return;
  }

  const recordObjectId = new mongoose.Types.ObjectId(recordId);

  const entryCount = await TransactionModel.countDocuments({
    userId,
    recordId: recordObjectId,
    kind: { $in: ["income", "expense"] },
  });

  if (entryCount > 0) {
    res.status(409).json({ message: "Remove this record's income and expense entries before deleting it." });
    return;
  }

  const record = await RecordModel.findOneAndDelete({ _id: recordObjectId, userId }).lean();

  if (!record) {
    res.status(404).json({ message: "Record not found." });
    return;
  }

  res.status(204).send();
});
