import bcrypt from "bcryptjs";
import { Router } from "express";
import { config } from "../config.js";
import { signJwt } from "../lib/auth.js";
import { UserModel } from "../models/User.js";
export const authRouter = Router();
authRouter.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user || !password || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ message: "Invalid email or password." });
        return;
    }
    const token = signJwt(String(user._id));
    res.cookie(config.cookieName, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.json({
        user: { id: user._id, name: user.name, email: user.email, currency: user.currency },
    });
});
authRouter.post("/logout", (_req, res) => {
    res.clearCookie(config.cookieName);
    res.status(204).send();
});
