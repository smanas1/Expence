import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { config } from "./config.js";
import { requireAdmin, requireAuth } from "./middleware/auth.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { budgetsRouter } from "./routes/budgets.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { debtsRouter } from "./routes/debts.js";
import { donationsRouter } from "./routes/donations.js";
import { transactionsRouter } from "./routes/transactions.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.clientUrl ? [config.clientUrl] : true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);
  app.use("/api/transactions", requireAuth, transactionsRouter);
  app.use("/api/budgets", requireAuth, budgetsRouter);
  app.use("/api/debts", requireAuth, debtsRouter);
  app.use("/api/donations", requireAuth, donationsRouter);
  app.use("/api/admin", requireAuth, requireAdmin, adminRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ message: "Unexpected server error." });
  });

  return app;
}

export const app = createApp();
