import type { NextFunction, Request, Response } from "express";

import { config } from "../config.js";
import { verifyJwt } from "../lib/auth.js";
import { UserModel } from "../models/User.js";

export interface AuthedRequest extends Request {
  userId?: string;
  userRole?: "user" | "admin";
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[config.cookieName];

  if (!token) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const payload = verifyJwt(token);
    req.userId = payload.sub;
    const user = await UserModel.findById(payload.sub).select("role").lean();

    if (!user) {
      res.status(401).json({ message: "Account not found." });
      return;
    }

    req.userRole = user.role === "admin" ? "admin" : "user";
    next();
  } catch {
    res.status(401).json({ message: "Session expired." });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "admin") {
    res.status(403).json({ message: "Admin access required." });
    return;
  }

  next();
}
