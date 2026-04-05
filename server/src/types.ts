export type TransactionKind = "income" | "expense" | "donation";

export interface DashboardSeedTransaction {
  title: string;
  amount: number;
  category: string;
  kind: TransactionKind;
  occurredAt: Date;
}
