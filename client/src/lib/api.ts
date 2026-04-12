import type { AdminDonation, AdminTransaction, AdminUser, AuthUser, BudgetItem, DashboardSummary, DebtItem, DonationPlan, Transaction } from "../types";

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function buildApiUrl(path: string) {
  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

async function request<T>(input: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(input), {
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
  me: () => request<{ user: AuthUser }>("/api/auth/me"),
  login: (email: string, password: string) =>
    request<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (payload: { name: string; email: string; password: string }) =>
    request<{ user: AuthUser }>("/api/auth/signup", {
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
  debts: () => request<{ debts: DebtItem[] }>("/api/debts"),
  addDebt: (payload: Omit<DebtItem, "_id" | "status" | "createdAt" | "settledAt">) =>
    request<DebtItem>("/api/debts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateDebtStatus: (id: string, status: "active" | "paid") =>
    request<DebtItem>(`/api/debts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteDebt: (id: string) =>
    request<void>(`/api/debts/${id}`, {
      method: "DELETE",
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
  adminUsers: () => request<{ users: AdminUser[] }>("/api/admin/users"),
  updateAdminUser: (id: string, payload: Partial<Pick<AdminUser, "name" | "email" | "currency" | "role">> & { password?: string }) =>
    request<{ user: AdminUser }>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  adminTransactions: (params: URLSearchParams) =>
    request<{ transactions: AdminTransaction[] }>(`/api/admin/transactions?${params.toString()}`),
  deleteAdminTransaction: (id: string) =>
    request<void>(`/api/admin/transactions/${id}`, {
      method: "DELETE",
    }),
  adminDonations: (params: URLSearchParams) =>
    request<{ donations: AdminDonation[] }>(`/api/admin/donations?${params.toString()}`),
  updateAdminDonationStatus: (id: string, status: "pending" | "completed") =>
    request<{ donation: AdminDonation }>(`/api/admin/donations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteAdminDonation: (id: string) =>
    request<void>(`/api/admin/donations/${id}`, {
      method: "DELETE",
    }),
};
