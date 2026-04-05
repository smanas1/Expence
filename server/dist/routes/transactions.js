import mongoose from "mongoose";
import { Router } from "express";
import { TransactionModel } from "../models/Transaction.js";
export const transactionsRouter = Router();
transactionsRouter.get("/", async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { q = "", startDate, endDate, kind, month, section } = req.query;
    const query = { userId };
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
    }
    else if (startDate || endDate) {
        query.occurredAt = {};
        if (startDate) {
            query.occurredAt.$gte = new Date(startDate);
        }
        if (endDate) {
            query.occurredAt.$lte = new Date(endDate);
        }
    }
    if (section && section !== "all") {
        query.section = section;
    }
    const transactions = await TransactionModel.find(query).sort({ occurredAt: -1 }).lean();
    res.json(transactions.map((transaction) => ({
        ...transaction,
        _id: String(transaction._id),
        section: transaction.section ?? "self",
    })));
});
transactionsRouter.post("/", async (req, res) => {
    const transaction = await TransactionModel.create({
        ...req.body,
        section: req.body.section ?? "self",
        userId: req.userId,
    });
    res.status(201).json({
        ...transaction.toObject(),
        _id: String(transaction._id),
        section: transaction.section ?? "self",
    });
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
