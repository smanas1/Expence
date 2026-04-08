import mongoose, { Schema } from "mongoose";
const debtSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    friendName: { type: String, required: true },
    amount: { type: Number, required: true },
    givenDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["active", "paid"], default: "active", index: true },
    settledAt: { type: Date, default: null },
}, { timestamps: true });
export const DebtModel = mongoose.models.Debt ?? mongoose.model("Debt", debtSchema);
export function normalizeDebt(item) {
    return {
        _id: String(item._id),
        friendName: item.friendName ?? "Unknown friend",
        amount: item.amount ?? 0,
        givenDate: new Date(item.givenDate ?? item.createdAt ?? new Date()).toISOString(),
        endDate: new Date(item.endDate ?? item.givenDate ?? item.createdAt ?? new Date()).toISOString(),
        notes: item.notes ?? "",
        status: item.status ?? "active",
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
        settledAt: item.settledAt ? new Date(item.settledAt).toISOString() : null,
    };
}
