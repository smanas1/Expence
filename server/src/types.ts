export type TransactionKind = "income" | "expense" | "donation";
export type ExpenseStatus = "realized" | "unrealized";

export interface DashboardSeedTransaction {
  title: string;
  amount: number;
  category?: string;
  section: string;
  recordId?: string;
  kind: TransactionKind;
  expenseStatus?: ExpenseStatus;
  occurredAt: Date;
}
