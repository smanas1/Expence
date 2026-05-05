import mongoose from "mongoose";
import { Router } from "express";

import { ensureRecordsBackfilledForUser } from "../lib/records.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { RecordModel } from "../models/Record.js";
import { recomputeUserTotals, TransactionModel } from "../models/Transaction.js";

export const transactionsRouter = Router();

transactionsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  await ensureRecordsBackfilledForUser(userId);
  const { q = "", startDate, endDate, kind, month } = req.query as Record<string, string>;
  const sectionQuery = req.query.section;
  const recordIdQuery = req.query.recordId;

  const query: Record<string, unknown> = { userId };

  if (kind && kind !== "all") {
    query.kind = kind;
  }

  if (q) {
    query.$or = [
      { title: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
      { section: { $regex: q, $options: "i" } },
    ];
  }

  if (month) {
    const [year, monthValue] = month.split("-").map(Number);
    const monthStart = new Date(Date.UTC(year, monthValue - 1, 1));
    const monthEnd = new Date(Date.UTC(year, monthValue, 1));
    query.occurredAt = { $gte: monthStart, $lt: monthEnd };
  } else if (startDate || endDate) {
    query.occurredAt = {};
    if (startDate) {
      (query.occurredAt as Record<string, Date>).$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      (query.occurredAt as Record<string, Date>).$lte = end;
    }
  }

  const requestedSections = (Array.isArray(sectionQuery) ? sectionQuery : typeof sectionQuery === "string" ? sectionQuery.split(",") : [])
    .flatMap((item) => typeof item === "string" ? item.split(",") : [])
    .map((item) => item.trim())
    .filter((item) => item && item !== "all");

  if (requestedSections.length === 1) {
    query.section = requestedSections[0];
  } else if (requestedSections.length > 1) {
    query.section = { $in: requestedSections };
  }

  if (typeof recordIdQuery === "string" && recordIdQuery.trim()) {
    if (!mongoose.Types.ObjectId.isValid(recordIdQuery)) {
      res.json([]);
      return;
    }

    query.recordId = new mongoose.Types.ObjectId(recordIdQuery);
  }

  const transactions = await TransactionModel.find(query).sort({ occurredAt: -1 }).lean();
  res.json(
    transactions.map((transaction) => ({
      ...transaction,
      _id: String(transaction._id),
      category: transaction.category ?? "",
      section: transaction.section ?? "self",
      recordId: transaction.recordId ? String(transaction.recordId) : null,
    })),
  );
});

transactionsRouter.post("/", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  await ensureRecordsBackfilledForUser(userId);
  const kind = req.body.kind;
  const recordId = req.body.recordId;

  if ((kind === "income" || kind === "expense") && (!recordId || !mongoose.Types.ObjectId.isValid(recordId))) {
    res.status(400).json({ message: "A record is required for income and expense entries." });
    return;
  }

  if (recordId && mongoose.Types.ObjectId.isValid(recordId)) {
    const record = await RecordModel.findOne({ _id: new mongoose.Types.ObjectId(recordId), userId }).lean();
    if (!record) {
      res.status(404).json({ message: "Record not found." });
      return;
    }
  }

  const transaction = await TransactionModel.create({
    ...req.body,
    section: req.body.section ?? "self",
    recordId: recordId && mongoose.Types.ObjectId.isValid(recordId) ? new mongoose.Types.ObjectId(recordId) : null,
    userId,
  });
  await recomputeUserTotals(userId);

  res.status(201).json({
    ...transaction.toObject(),
    _id: String(transaction._id),
    category: transaction.category ?? "",
    section: transaction.section ?? "self",
    recordId: transaction.recordId ? String(transaction.recordId) : null,
  });
});

transactionsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = new mongoose.Types.ObjectId(req.userId);
  await ensureRecordsBackfilledForUser(userId);
  const kind = req.body.kind;
  const recordId = req.body.recordId;

  if ((kind === "income" || kind === "expense") && (!recordId || !mongoose.Types.ObjectId.isValid(recordId))) {
    res.status(400).json({ message: "A record is required for income and expense entries." });
    return;
  }

  if (recordId && mongoose.Types.ObjectId.isValid(recordId)) {
    const record = await RecordModel.findOne({ _id: new mongoose.Types.ObjectId(recordId), userId }).lean();
    if (!record) {
      res.status(404).json({ message: "Record not found." });
      return;
    }
  }

  const transaction = await TransactionModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(transactionId),
      userId,
    },
    {
      $set: {
        title: req.body.title,
        amount: req.body.amount,
        category: req.body.category ?? "",
        section: req.body.section ?? "self",
        recordId: recordId && mongoose.Types.ObjectId.isValid(recordId) ? new mongoose.Types.ObjectId(recordId) : null,
        kind: req.body.kind,
        occurredAt: req.body.occurredAt,
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!transaction) {
    res.status(404).json({ message: "Transaction not found." });
    return;
  }

  await recomputeUserTotals(userId);

  res.json({
    ...transaction,
    _id: String(transaction._id),
    category: transaction.category ?? "",
    section: transaction.section ?? "self",
    recordId: transaction.recordId ? String(transaction.recordId) : null,
  });
});

transactionsRouter.delete("/bulk", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const ids = (req.body?.ids as string[]) ?? [];

  await Promise.all(
    ids.map((id) =>
      TransactionModel.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        userId,
      }),
    ),
  );
  await recomputeUserTotals(userId);

  res.status(204).send();
});
