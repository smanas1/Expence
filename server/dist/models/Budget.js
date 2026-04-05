import mongoose, { Schema } from "mongoose";
const budgetSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, required: true },
    month: { type: String, required: true },
    limit: { type: Number, required: true },
}, { timestamps: true });
budgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });
export const BudgetModel = mongoose.models.Budget ?? mongoose.model("Budget", budgetSchema);
