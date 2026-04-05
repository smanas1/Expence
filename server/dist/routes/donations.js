import mongoose from "mongoose";
import { Router } from "express";
import { DonationPlanModel, normalizeDonationPlan } from "../models/DonationPlan.js";
export const donationsRouter = Router();
donationsRouter.get("/", async (req, res) => {
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
donationsRouter.post("/", async (req, res) => {
    const completedAt = req.body.status === "completed" ? req.body.completedAt ?? req.body.initiatedAt : null;
    const plan = await DonationPlanModel.create({
        userId: req.userId,
        title: req.body.title,
        amount: req.body.amount,
        status: req.body.status,
        initiatedAt: req.body.initiatedAt,
        completedAt,
    });
    res.status(201).json(normalizeDonationPlan(plan.toObject()));
});
donationsRouter.patch("/:id/status", async (req, res) => {
    const nextStatus = req.body.status === "completed" ? "completed" : "pending";
    const donationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const donation = await DonationPlanModel.findOneAndUpdate({
        _id: new mongoose.Types.ObjectId(donationId),
        userId: new mongoose.Types.ObjectId(req.userId),
    }, {
        $set: {
            status: nextStatus,
            completedAt: nextStatus === "completed" ? new Date() : null,
        },
    }, { new: true }).lean();
    if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
    }
    return res.json(normalizeDonationPlan(donation));
});
