import mongoose, { Schema } from "mongoose";
const recordSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
    color: { type: String, default: "#0f766e" },
}, { timestamps: true });
recordSchema.index({ userId: 1, name: 1 });
export const RecordModel = mongoose.models.Record ?? mongoose.model("Record", recordSchema);
