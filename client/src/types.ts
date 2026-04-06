export type TransactionKind = "income" | "expense" | "donation";
export type UserRole = "user" | "admin";

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  currency?: string;
  role: UserRole;
}

export interface Transaction {
  _id: string;
  title: string;
  amount: number;
  category: string;
  section: string;
  kind: TransactionKind;
  occurredAt: string;
}

export interface AdminTransaction extends Transaction {
  user: { id: string; name: string; email: string } | null;
}

export interface BudgetItem {
  _id?: string;
  category: string;
  month: string;
  limit: number;
  spent?: number;
}

export interface DonationPlan {
  _id: string;
  title: string;
  amount: number;
  status: "pending" | "completed";
  initiatedAt: string;
  completedAt?: string | null;
}

export interface AdminDonation extends DonationPlan {
  user: { id: string; name: string; email: string } | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  currency: string;
  role: UserRole;
  createdAt: string;
}

export interface DashboardSummary {
  totals?: {
    totalIncome: number;
    totalExpense: number;
    totalDonation: number;
    totalSavings: number;
  };
  chart: Array<{
    _id: {
      month: string;
      kind: TransactionKind;
    };
    total: number;
  }>;
  budgets: BudgetItem[];
  recentTransactions: Transaction[];
  donationPlans: DonationPlan[];
  healthScore: number;
}
