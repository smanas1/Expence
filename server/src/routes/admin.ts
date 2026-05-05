import mongoose from "mongoose";
import { Router } from "express";

import { normalizeDonationPlan, DonationPlanModel } from "../models/DonationPlan.js";
import { recomputeUserTotals, TransactionModel } from "../models/Transaction.js";
import { UserModel } from "../models/User.js";

export const adminRouter = Router();

adminRouter.get("/users", async (_req, res) => {
  const users = await UserModel.find().sort({ createdAt: -1 }).lean();

  res.json({
    users: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      currency: user.currency,
      role: user.role ?? "user",
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : new Date(user.createdAt ?? Date.now()).toISOString(),
    })),
  });
});

adminRouter.patch("/users/:id", async (req, res) => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { name, email, currency, role, password } = req.body as {
    name?: string;
    email?: string;
    currency?: string;
    role?: "user" | "admin";
    password?: string;
  };

  const update: Record<string, string> = {};

  if (name?.trim()) {
    update.name = name.trim();
  }
  if (email?.trim()) {
    update.email = email.trim().toLowerCase();
  }
  if (currency?.trim()) {
    update.currency = currency.trim().toUpperCase();
  }
  if (role === "user" || role === "admin") {
    update.role = role;
  }
  if (password?.trim()) {
    update.password = password.trim();
  }

  const user = await UserModel.findByIdAndUpdate(userId, { $set: update }, { returnDocument: "after" }).lean();

  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  res.json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      currency: user.currency,
      role: user.role ?? "user",
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : new Date(user.createdAt ?? Date.now()).toISOString(),
    },
  });
});

adminRouter.get("/transactions", async (req, res) => {
  const { q = "", kind, section, userId } = req.query as Record<string, string>;
  const query: Record<string, unknown> = {};

  if (kind && kind !== "all") {
    query.kind = kind;
  }
  if (section && section !== "all") {
    query.section = section;
  }
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    query.userId = new mongoose.Types.ObjectId(userId);
  }
  if (q) {
    query.$or = [
      { title: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
      { section: { $regex: q, $options: "i" } },
    ];
  }

  const transactions = await TransactionModel.find(query)
    .sort({ occurredAt: -1 })
    .populate("userId", "name email")
    .lean();

  res.json({
    transactions: transactions.map((transaction) => ({
      _id: String(transaction._id),
      title: transaction.title,
      amount: transaction.amount,
      category: transaction.category ?? "",
      section: transaction.section ?? "self",
      recordId: transaction.recordId ? String(transaction.recordId) : null,
      kind: transaction.kind,
      occurredAt:
        transaction.occurredAt instanceof Date
          ? transaction.occurredAt.toISOString()
          : new Date(transaction.occurredAt).toISOString(),
      user: transaction.userId && typeof transaction.userId === "object"
        ? {
            id: String(transaction.userId._id),
            name: "name" in transaction.userId ? transaction.userId.name : "Unknown user",
            email: "email" in transaction.userId ? transaction.userId.email : "",
          }
        : null,
    })),
  });
});

adminRouter.delete("/transactions/:id", async (req, res) => {
  const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const transaction = await TransactionModel.findByIdAndDelete(transactionId).lean();

  if (!transaction) {
    res.status(404).json({ message: "Transaction not found." });
    return;
  }

  await recomputeUserTotals(new mongoose.Types.ObjectId(transaction.userId));

  res.status(204).send();
});

adminRouter.get("/donations", async (req, res) => {
  const { status, userId } = req.query as Record<string, string>;
  const query: Record<string, unknown> = {};

  if (status && status !== "all") {
    query.status = status;
  }
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    query.userId = new mongoose.Types.ObjectId(userId);
  }

  const donations = await DonationPlanModel.find(query)
    .sort({ initiatedAt: -1 })
    .populate("userId", "name email")
    .lean();

  res.json({
    donations: donations.map((donation) => ({
      ...normalizeDonationPlan(donation),
      user: donation.userId && typeof donation.userId === "object"
        ? {
            id: String(donation.userId._id),
            name: "name" in donation.userId ? donation.userId.name : "Unknown user",
            email: "email" in donation.userId ? donation.userId.email : "",
          }
        : null,
    })),
  });
});

adminRouter.patch("/donations/:id/status", async (req, res) => {
  const donationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const nextStatus = req.body.status === "completed" ? "completed" : "pending";

  const donation = await DonationPlanModel.findByIdAndUpdate(
    donationId,
    {
      $set: {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date() : null,
      },
    },
    { returnDocument: "after" },
  )
    .populate("userId", "name email")
    .lean();

  if (!donation) {
    res.status(404).json({ message: "Donation not found." });
    return;
  }

  res.json({
    donation: {
      ...normalizeDonationPlan(donation),
      user: donation.userId && typeof donation.userId === "object"
        ? {
            id: String(donation.userId._id),
            name: "name" in donation.userId ? donation.userId.name : "Unknown user",
            email: "email" in donation.userId ? donation.userId.email : "",
          }
        : null,
    },
  });
});

adminRouter.delete("/donations/:id", async (req, res) => {
  const donationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const donation = await DonationPlanModel.findByIdAndDelete(donationId).lean();

  if (!donation) {
    res.status(404).json({ message: "Donation not found." });
    return;
  }

  res.status(204).send();
});
