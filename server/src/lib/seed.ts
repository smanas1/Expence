import { BudgetModel } from "../models/Budget.js";
import { DonationPlanModel } from "../models/DonationPlan.js";
import { TransactionModel } from "../models/Transaction.js";
import { UserModel } from "../models/User.js";
import type { DashboardSeedTransaction } from "../types.js";

const seedTransactions: DashboardSeedTransaction[] = [
  { title: "Salary Deposit", amount: 120000, category: "Salary", section: "self", kind: "income", occurredAt: new Date("2026-04-01T09:00:00Z") },
  { title: "Freelance Payout", amount: 28000, category: "Side Hustle", section: "self", kind: "income", occurredAt: new Date("2026-04-03T09:00:00Z") },
  { title: "Groceries", amount: 16000, category: "Food", section: "family", kind: "expense", occurredAt: new Date("2026-04-04T10:30:00Z") },
  { title: "Metro Card", amount: 4200, category: "Transport", section: "self", kind: "expense", occurredAt: new Date("2026-04-04T16:30:00Z") },
  { title: "Community Fund", amount: 8000, category: "Zakat", section: "family", kind: "donation", occurredAt: new Date("2026-04-02T07:00:00Z") },
  { title: "Internet Bill", amount: 2500, category: "Utilities", section: "family", kind: "expense", occurredAt: new Date("2026-04-05T08:00:00Z") },
];

export async function seedDemoUser() {
  const existing = await UserModel.findOne({ email: "demo@fintrack.app" });
  if (existing) {
    if (!existing.password || existing.role !== "admin") {
      existing.password = "demo1234";
      existing.role = "admin";
      await existing.save();
    }

    return existing;
  }

  const user = await UserModel.create({
    email: "demo@fintrack.app",
    name: "Anas Rahman",
    password: "demo1234",
    role: "admin",
  });

  await TransactionModel.insertMany(
    seedTransactions.map((entry) => ({
      ...entry,
      userId: user._id,
    })),
  );

  await BudgetModel.insertMany([
    { userId: user._id, category: "Food", month: "2026-04", limit: 20000 },
    { userId: user._id, category: "Transport", month: "2026-04", limit: 6000 },
    { userId: user._id, category: "Utilities", month: "2026-04", limit: 5000 },
  ]);

  await DonationPlanModel.create({
    userId: user._id,
    title: "Family support fund",
    amount: 2000,
    status: "pending",
    initiatedAt: new Date("2026-04-05T00:00:00Z"),
    completedAt: null,
  });

  return user;
}
