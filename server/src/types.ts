export type TransactionKind = "income" | "expense" | "donation";

export interface DashboardSeedTransaction {
  title: string;
  amount: number;
  category?: string;
  section: string;
  recordId?: string;
  kind: TransactionKind;
  occurredAt: Date;
}
