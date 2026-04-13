import type { Request, Response } from "express";

import { app } from "./app.js";
import { bootstrapServer } from "./bootstrap.js";

export default async function handler(req: Request, res: Response) {
  try {
    await bootstrapServer();
    app(req, res);
  } catch (error) {
    console.error("Failed to handle Vercel request", {
      method: req.method,
      url: req.url,
      error,
    });

    res.status(500).json({ message: "Server failed to start." });
  }
}
