import mongoose from "mongoose";
import { Router } from "express";

import type { AuthedRequest } from "../middleware/auth.js";
import { recomputeUserTotals, TransactionModel } from "../models/Transaction.js";

export const transactionsRouter = Router();

transactionsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const { q = "", startDate, endDate, kind, month, section } = req.query as Record<string, string>;

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

  if (section && section !== "all") {
    query.section = section;
  }

  const transactions = await TransactionModel.find(query).sort({ occurredAt: -1 }).lean();
  res.json(
    transactions.map((transaction) => ({
      ...transaction,
      _id: String(transaction._id),
      category: transaction.category ?? "",
      section: transaction.section ?? "self",
    })),
  );
});

transactionsRouter.post("/", async (req: AuthedRequest, res) => {
  const transaction = await TransactionModel.create({
    ...req.body,
    section: req.body.section ?? "self",
    userId: req.userId,
  });
  await recomputeUserTotals(new mongoose.Types.ObjectId(req.userId));

  res.status(201).json({
    ...transaction.toObject(),
    _id: String(transaction._id),
    category: transaction.category ?? "",
    section: transaction.section ?? "self",
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
