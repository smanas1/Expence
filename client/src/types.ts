export type TransactionKind = "income" | "expense" | "donation";

export interface Transaction {
  _id: string;
  title: string;
  amount: number;
  category: string;
  section: string;
  kind: TransactionKind;
  occurredAt: string;
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
