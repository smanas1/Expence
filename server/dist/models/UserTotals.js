import mongoose, { Schema } from "mongoose";
const userTotalsSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    totalIncome: { type: Number, default: 0 },
    totalExpense: { type: Number, default: 0 },
    totalDonation: { type: Number, default: 0 },
    totalSavings: { type: Number, default: 0 },
    lastTransactionAt: { type: Date, default: null },
}, { timestamps: true });
export const UserTotalsModel = mongoose.models.UserTotals ?? mongoose.model("UserTotals", userTotalsSchema);
