import { Router } from "express";
import { config } from "../config.js";
import { signJwt } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/User.js";
export const authRouter = Router();
function setSessionCookie(res, userId) {
    const token = signJwt(userId);
    res.cookie(config.cookieName, token, {
        httpOnly: true,
        sameSite: config.cookieSameSite,
        secure: config.isProduction || config.cookieSameSite === "none",
        domain: config.cookieDomain,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    });
}
authRouter.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user || !password || password !== user.password) {
        res.status(401).json({ message: "Invalid email or password." });
        return;
    }
    setSessionCookie(res, String(user._id));
    res.json({
        user: { id: user._id, name: user.name, email: user.email, currency: user.currency, role: user.role },
    });
});
authRouter.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedName || !normalizedEmail || !password) {
        res.status(400).json({ message: "Name, email, and password are required." });
        return;
    }
    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
        res.status(409).json({ message: "An account with this email already exists." });
        return;
    }
    const user = await UserModel.create({
        name: normalizedName,
        email: normalizedEmail,
        password,
        role: "user",
    });
    setSessionCookie(res, String(user._id));
    res.status(201).json({
        user: { id: user._id, name: user.name, email: user.email, currency: user.currency, role: user.role },
    });
});
authRouter.post("/logout", (_req, res) => {
    res.clearCookie(config.cookieName, {
        httpOnly: true,
        sameSite: config.cookieSameSite,
        secure: config.isProduction || config.cookieSameSite === "none",
        domain: config.cookieDomain,
    });
    res.status(204).send();
});
authRouter.get("/me", requireAuth, async (req, res) => {
    const user = await UserModel.findById(req.userId).lean();
    if (!user) {
        res.status(401).json({ message: "Account not found." });
        return;
    }
    res.json({
        user: { id: user._id, name: user.name, email: user.email, currency: user.currency, role: user.role },
    });
});
