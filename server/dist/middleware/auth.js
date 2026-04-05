import { config } from "../config.js";
import { verifyJwt } from "../lib/auth.js";
export function requireAuth(req, res, next) {
    const token = req.cookies?.[config.cookieName];
    if (!token) {
        res.status(401).json({ message: "Authentication required." });
        return;
    }
    try {
        const payload = verifyJwt(token);
        req.userId = payload.sub;
        next();
    }
    catch {
        res.status(401).json({ message: "Session expired." });
    }
}
