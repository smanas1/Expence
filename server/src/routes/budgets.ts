import mongoose from "mongoose";
import { Router } from "express";

import type { AuthedRequest } from "../middleware/auth.js";
import { BudgetModel } from "../models/Budget.js";

export const budgetsRouter = Router();

budgetsRouter.get("/", async (req: AuthedRequest, res) => {
  const budgets = await BudgetModel.find({
    userId: new mongoose.Types.ObjectId(req.userId),
  })
    .sort({ month: -1, category: 1 })
    .lean();

  res.json(budgets);
});

budgetsRouter.post("/", async (req: AuthedRequest, res) => {
  const { category, month, limit } = req.body as {
    category: string;
    month: string;
    limit: number;
  };

  const budget = await BudgetModel.findOneAndUpdate(
    { userId: req.userId, category, month },
    { userId: req.userId, category, month, limit },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(201).json(budget);
});
