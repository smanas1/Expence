import mongoose, { Schema } from "mongoose";
const userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    currency: { type: String, default: "BDT" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
}, { timestamps: true });
export const UserModel = mongoose.models.User ?? mongoose.model("User", userSchema);
