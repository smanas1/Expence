import mongoose from "mongoose";
import { Router } from "express";
import { TransactionModel } from "../models/Transaction.js";
export const transactionsRouter = Router();
transactionsRouter.get("/", async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { q = "", startDate, endDate, kind } = req.query;
    const query = { userId };
    if (kind && kind !== "all") {
        query.kind = kind;
    }
    if (q) {
        query.$or = [
            { title: { $regex: q, $options: "i" } },
            { category: { $regex: q, $options: "i" } },
        ];
    }
    if (startDate || endDate) {
        query.occurredAt = {};
        if (startDate) {
            query.occurredAt.$gte = new Date(startDate);
        }
        if (endDate) {
            query.occurredAt.$lte = new Date(endDate);
        }
    }
    const transactions = await TransactionModel.find(query).sort({ occurredAt: -1 }).lean();
    res.json(transactions);
});
transactionsRouter.post("/", async (req, res) => {
    const transaction = await TransactionModel.create({
        ...req.body,
        userId: req.userId,
    });
    res.status(201).json(transaction);
});
transactionsRouter.delete("/bulk", async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const ids = req.body?.ids ?? [];
    await Promise.all(ids.map((id) => TransactionModel.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        userId,
    })));
    res.status(204).send();
});
