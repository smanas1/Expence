import mongoose, { Schema } from "mongoose";
import { UserTotalsModel } from "./UserTotals.js";
const transactionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, default: "" },
    section: { type: String, required: true, default: "self" },
    kind: {
        type: String,
        enum: ["income", "expense", "donation"],
        required: true,
        index: true,
    },
    occurredAt: { type: Date, required: true, index: true },
}, { timestamps: true });
export async function recomputeUserTotals(userId) {
    const [totals] = await mongoose.model("Transaction").aggregate([
        { $match: { userId } },
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
                        $cond: [{ $eq: ["$kind", "expense"] }, "$amount", 0],
                    },
                },
                totalDonation: {
                    $sum: {
                        $cond: [{ $eq: ["$kind", "donation"] }, "$amount", 0],
                    },
                },
                lastTransactionAt: { $max: "$occurredAt" },
            },
        },
    ]);
    const totalIncome = totals?.totalIncome ?? 0;
    const totalExpense = totals?.totalExpense ?? 0;
    const totalDonation = totals?.totalDonation ?? 0;
    await UserTotalsModel.findOneAndUpdate({ userId }, {
        userId,
        totalIncome,
        totalExpense,
        totalDonation,
        totalSavings: totalIncome - totalExpense - totalDonation,
        lastTransactionAt: totals?.lastTransactionAt ?? null,
    }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
}
transactionSchema.pre("save", function onSave() {
    this.$locals.previousUserId = this.isNew ? null : this.get("userId");
});
transactionSchema.post("save", async function onSaved() {
    await recomputeUserTotals(this.userId);
});
transactionSchema.post("findOneAndDelete", async function onDeleted(doc) {
    if (doc?.userId) {
        await recomputeUserTotals(doc.userId);
    }
});
export const TransactionModel = mongoose.models.Transaction ?? mongoose.model("Transaction", transactionSchema);
