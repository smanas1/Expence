import mongoose from "mongoose";
import { Router } from "express";

import type { AuthedRequest } from "../middleware/auth.js";
import { BudgetModel } from "../models/Budget.js";
import { DonationPlanModel, normalizeDonationPlan } from "../models/DonationPlan.js";
import { TransactionModel } from "../models/Transaction.js";
import { UserTotalsModel } from "../models/UserTotals.js";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (req: AuthedRequest, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const month = new Date().toISOString().slice(0, 7);

  const [totals, chart, budgets, recentTransactions, plans] = await Promise.all([
    UserTotalsModel.findOne({ userId }).lean(),
    TransactionModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$occurredAt" } },
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
    TransactionModel.find({ userId }).sort({ occurredAt: -1 }).limit(8).lean(),
    DonationPlanModel.find({ userId }).lean(),
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
    recentTransactions,
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
