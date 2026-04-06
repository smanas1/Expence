import mongoose from "mongoose";
import { Router } from "express";

import type { AuthedRequest } from "../middleware/auth.js";
import { DonationPlanModel, normalizeDonationPlan } from "../models/DonationPlan.js";

export const donationsRouter = Router();

async function createDonation(req: AuthedRequest, res: import("express").Response) {
  const completedAt =
    req.body.status === "completed" ? req.body.completedAt ?? req.body.initiatedAt : null;

  const plan = await DonationPlanModel.create({
    userId: req.userId,
    title: req.body.title,
    amount: req.body.amount,
    status: req.body.status,
    initiatedAt: req.body.initiatedAt,
    completedAt,
  });

  return res.status(201).json(normalizeDonationPlan(plan.toObject()));
}

donationsRouter.get("/", async (req: AuthedRequest, res) => {
  const plans = await DonationPlanModel.find({
    userId: new mongoose.Types.ObjectId(req.userId),
  })
    .lean();

  res.json({
    donations: plans
      .map(normalizeDonationPlan)
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === "pending" ? -1 : 1;
        }

        return new Date(right.initiatedAt).getTime() - new Date(left.initiatedAt).getTime();
      }),
  });
});

donationsRouter.post("/", createDonation);
donationsRouter.post("/recurring", createDonation);

donationsRouter.patch("/:id/status", async (req: AuthedRequest, res) => {
  const nextStatus = req.body.status === "completed" ? "completed" : "pending";
  const donationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const donation = await DonationPlanModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(donationId),
      userId: new mongoose.Types.ObjectId(req.userId),
    },
    {
      $set: {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date() : null,
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!donation) {
    return res.status(404).json({ message: "Donation not found" });
  }

  return res.json(normalizeDonationPlan(donation));
});

donationsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const donationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const donation = await DonationPlanModel.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(donationId),
    userId: new mongoose.Types.ObjectId(req.userId),
  }).lean();

  if (!donation) {
    return res.status(404).json({ message: "Donation not found" });
  }

  return res.status(204).send();
});
