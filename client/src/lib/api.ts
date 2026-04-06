import type { BudgetItem, DashboardSummary, DonationPlan, Transaction } from "../types";

async function request<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: { name: string; email: string } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (payload: { name: string; email: string; password: string }) =>
    request<{ user: { name: string; email: string } }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  summary: () => request<DashboardSummary>("/api/dashboard/summary"),
  transactions: (params: URLSearchParams) => request<Transaction[]>(`/api/transactions?${params.toString()}`),
  addTransaction: (payload: Omit<Transaction, "_id">) =>
    request<Transaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteTransactions: (ids: string[]) =>
    request<void>("/api/transactions/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
  addBudget: (payload: BudgetItem) =>
    request<BudgetItem>("/api/budgets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  donations: () => request<{ donations: DonationPlan[] }>("/api/donations"),
  addDonation: (payload: Omit<DonationPlan, "_id">) =>
    request<DonationPlan>("/api/donations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteDonation: (id: string) =>
    request<void>(`/api/donations/${id}`, {
      method: "DELETE",
    }),
  updateDonationStatus: (id: string, status: DonationPlan["status"]) =>
    request<DonationPlan>(`/api/donations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
