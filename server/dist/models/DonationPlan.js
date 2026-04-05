import mongoose, { Schema } from "mongoose";
const donationPlanSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    initiatedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
}, { timestamps: true });
export const DonationPlanModel = mongoose.models.DonationPlan ?? mongoose.model("DonationPlan", donationPlanSchema);
export function normalizeDonationPlan(plan) {
    const initiatedAt = plan.initiatedAt ?? plan.createdAt ?? plan.nextDueAt ?? new Date();
    const completedAt = plan.completedAt ?? null;
    const status = plan.status ?? (completedAt ? "completed" : "pending");
    return {
        _id: String(plan._id),
        title: plan.title ?? "Untitled donation",
        amount: plan.amount ?? 0,
        status,
        initiatedAt: new Date(initiatedAt).toISOString(),
        completedAt: completedAt ? new Date(completedAt).toISOString() : null,
    };
}
