import mongoose from "mongoose";
import { Router } from "express";

import { ensureRecordsBackfilledForUser } from "../lib/records.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { BudgetModel } from "../models/Budget.js";
import { DonationPlanModel, normalizeDonationPlan } from "../models/DonationPlan.js";
import { TransactionModel } from "../models/Transaction.js";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  await ensureRecordsBackfilledForUser(userId);
  const month = new Date().toISOString().slice(0, 7);
  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() - 29);

  const [totals, chart, budgets, recentTransactions, plans] = await Promise.all([
    TransactionModel.aggregate<{
      totalIncome: number;
      totalExpense: number;
      totalDonation: number;
      totalUnrealizedExpense: number;
      totalSavings: number;
    }>([
      { $match: { userId, occurredAt: { $gte: windowStart } } },
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
              $cond: [
                { $and: [{ $eq: ["$kind", "expense"] }, { $ne: [{ $ifNull: ["$expenseStatus", "realized"] }, "unrealized"] }] },
                "$amount",
                0,
              ],
            },
          },
          totalUnrealizedExpense: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$kind", "expense"] }, { $eq: [{ $ifNull: ["$expenseStatus", "realized"] }, "unrealized"] }] },
                "$amount",
                0,
              ],
            },
          },
          totalDonation: {
            $sum: {
              $cond: [{ $eq: ["$kind", "donation"] }, "$amount", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalIncome: 1,
          totalExpense: 1,
          totalDonation: 1,
          totalUnrealizedExpense: 1,
          totalSavings: { $subtract: ["$totalIncome", { $add: ["$totalExpense", "$totalDonation"] }] },
        },
      },
    ]).then((rows) => rows[0] ?? { totalIncome: 0, totalExpense: 0, totalDonation: 0, totalUnrealizedExpense: 0, totalSavings: 0 }),
    TransactionModel.aggregate([
      { $match: { userId, occurredAt: { $gte: windowStart }, $or: [{ kind: { $ne: "expense" } }, { expenseStatus: { $ne: "unrealized" } }, { expenseStatus: { $exists: false } }] } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%m-%d", date: "$occurredAt" } },
            kind: "$kind",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]),
    BudgetModel.aggregate([
      { $match: { userId, month } },
      {
        $lookup: {
          from: "transactions",
          let: { category: "$category", userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$category", "$$category"] },
                    { $eq: ["$userId", "$$userId"] },
                    { $eq: ["$kind", "expense"] },
                    { $gte: ["$occurredAt", windowStart] },
                    {
                      $eq: [
                        { $dateToString: { format: "%Y-%m", date: "$occurredAt" } },
                        month,
                      ],
                    },
                  ],
                },
              },
            },
            { $group: { _id: null, spent: { $sum: "$amount" } } },
          ],
          as: "usage",
        },
      },
      {
        $project: {
          category: 1,
          month: 1,
          limit: 1,
          spent: { $ifNull: [{ $arrayElemAt: ["$usage.spent", 0] }, 0] },
        },
      },
    ]),
    TransactionModel.find({ userId, occurredAt: { $gte: windowStart } }).sort({ occurredAt: -1 }).lean(),
    DonationPlanModel.find({
      userId,
      $or: [
        { initiatedAt: { $gte: windowStart } },
        { completedAt: { $gte: windowStart } },
      ],
    }).lean(),
  ]);

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((totals?.totalSavings ?? 0) / Math.max((totals?.totalExpense ?? 0) + (totals?.totalDonation ?? 0), 1)) * 65 +
          (budgets.length
            ? budgets.filter((item) => item.spent <= item.limit * 0.8).length / budgets.length
            : 1) *
            35,
      ),
    ),
  );

  res.json({
    totals,
    chart,
    budgets,
    recentTransactions: recentTransactions.map((transaction) => ({
      ...transaction,
      _id: String(transaction._id),
      category: transaction.category ?? "",
      expenseStatus: transaction.expenseStatus ?? "realized",
      section: transaction.section ?? "self",
      recordId: transaction.recordId ? String(transaction.recordId) : null,
    })),
    donationPlans: plans
      .map(normalizeDonationPlan)
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === "pending" ? -1 : 1;
        }

        return new Date(right.initiatedAt).getTime() - new Date(left.initiatedAt).getTime();
      }),
    healthScore,
  });
});
