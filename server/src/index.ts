import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";

import { config } from "./config.js";
import { seedDemoUser } from "./lib/seed.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { budgetsRouter } from "./routes/budgets.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { donationsRouter } from "./routes/donations.js";
import { transactionsRouter } from "./routes/transactions.js";

const app = express();

app.use(
  cors({
    origin: config.clientUrl,
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
app.use("/api/donations", requireAuth, donationsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Unexpected server error." });
});

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log(`Connected to MongoDB at ${config.mongoUri}`);
  } catch (error) {
    console.error("Failed to connect to MongoDB.");
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") &&
      (config.mongoUri.startsWith("mongodb+srv://") || config.mongoUri.includes(".mongodb.net"))
    ) {
      console.error(
        "Atlas DNS lookup failed in Node. Use the standard mongodb:// Atlas connection string instead of mongodb+srv:// for this environment.",
      );
    }
    throw error;
  }

  await seedDemoUser();

  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
