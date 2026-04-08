import mongoose from "mongoose";
import { Router } from "express";

import type { AuthedRequest } from "../middleware/auth.js";
import { DebtModel, normalizeDebt } from "../models/Debt.js";

export const debtsRouter = Router();

debtsRouter.get("/", async (req: AuthedRequest, res) => {
  const debts = await DebtModel.find({
    userId: new mongoose.Types.ObjectId(req.userId),
  })
    .sort({ endDate: 1, createdAt: -1 })
    .lean();

  res.json({
    debts: debts.map(normalizeDebt),
  });
});

debtsRouter.post("/", async (req: AuthedRequest, res) => {
  const debt = await DebtModel.create({
    userId: req.userId,
    friendName: req.body.friendName,
    amount: req.body.amount,
    givenDate: req.body.givenDate,
    endDate: req.body.endDate,
    notes: req.body.notes ?? "",
    status: "active",
    settledAt: null,
  });

  res.status(201).json(normalizeDebt(debt.toObject()));
});

debtsRouter.patch("/:id/status", async (req: AuthedRequest, res) => {
  const debtId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const nextStatus = req.body.status === "paid" ? "paid" : "active";

  const debt = await DebtModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(debtId),
      userId: new mongoose.Types.ObjectId(req.userId),
    },
    {
      $set: {
        status: nextStatus,
        settledAt: nextStatus === "paid" ? new Date() : null,
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!debt) {
    res.status(404).json({ message: "Debt not found." });
    return;
  }

  res.json(normalizeDebt(debt));
});

debtsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const debtId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const debt = await DebtModel.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(debtId),
    userId: new mongoose.Types.ObjectId(req.userId),
  }).lean();

  if (!debt) {
    res.status(404).json({ message: "Debt not found." });
    return;
  }

  res.status(204).send();
});
