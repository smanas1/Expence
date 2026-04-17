import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownCircle, ArrowUpCircle, Bolt, CheckCircle2, Clock3, HeartHandshake, Landmark, LogOut, Moon, Pencil, Search, Shield, SunMedium, Target, Users, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Toaster, toast } from "sonner";

import { CommandPalette } from "./components/command-palette";
import { TransactionTable } from "./components/transaction-table";
import { api } from "./lib/api";
import { formatCalendarDate, formatCurrency, formatRecentDate } from "./lib/format";
import { cn } from "./lib/utils";
import type { AdminDonation, AdminTransaction, AdminUser, AuthUser, DashboardSummary, DebtItem, DonationPlan, Transaction, TransactionKind } from "./types";

const queryClient = new QueryClient();
type DonationDraft = { title: string; amount: number | ""; status: "pending" | "completed"; initiatedAt: string; completedAt: string | null };
type TransactionDraft = Omit<Transaction, "_id" | "amount"> & { amount: number | "" };
type PdfExportDraft = { startDate: string; endDate: string; sections: string[] };
type AdminUserDraft = { name: string; email: string; currency: string; role: "user" | "admin"; password: string };
type DebtStatus = "active" | "paid";
type DebtDraft = {
  friendName: string;
  amount: number | "";
  givenDate: string;
  endDate: string;
  notes: string;
};

function formatCategoryLabel(category?: string) {
  return category?.trim() ? category : "Uncategorized";
}

function createEmptyDebtDraft(): DebtDraft {
  return {
    friendName: "",
    amount: "",
    givenDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

function createEmptyTransactionDraft(kind: TransactionKind = "expense"): TransactionDraft {
  return {
    title: "",
    amount: "",
    category: "",
    section: "family",
    kind,
    occurredAt: new Date().toISOString(),
  };
}

function transactionTone(kind: TransactionKind) {
  if (kind === "income") {
    return {
      badge: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      amount: "text-emerald-600 dark:text-emerald-300",
    };
  }

  if (kind === "expense") {
    return {
      badge: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
      amount: "text-rose-600 dark:text-rose-300",
    };
  }

  return {
    badge: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
    amount: "text-cyan-600 dark:text-cyan-300",
  };
}

function useThemeMode() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = window.localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) {
      return saved;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return { theme, toggle };
}

function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[28px] border border-white/30 bg-white/70 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-5", className)}>
      {children}
    </div>
  );
}

function LoginGate({ children, ready, checkingSession, onAuthenticated }: { children: ReactNode; ready: boolean; checkingSession?: boolean; onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [credentials, setCredentials] = useState({ name: "Anas Rahman", email: "demo@fintrack.app", password: "demo1234" });
  const authMutation = useMutation({
    mutationFn: () =>
      mode === "signup"
        ? api.signup({ name: credentials.name, email: credentials.email, password: credentials.password })
        : api.login(credentials.email, credentials.password),
    onSuccess: (data) => {
      onAuthenticated(data.user);
      toast.success(mode === "signup" ? "Account created successfully." : "Signed in successfully.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const { isPending } = authMutation;

  if (ready) return <>{children}</>;

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_35%),linear-gradient(135deg,#f8fafc,#dbeafe_45%,#f8fafc)] px-4 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.15),_transparent_35%),linear-gradient(135deg,#020617,#0f172a_45%,#020617)]">
        <div className="rounded-[32px] border border-white/40 bg-white/70 px-8 py-6 text-center shadow-2xl shadow-cyan-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/75">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-600">FinTrack</p>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Restoring your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_35%),linear-gradient(135deg,#f8fafc,#dbeafe_45%,#f8fafc)] px-4 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.15),_transparent_35%),linear-gradient(135deg,#020617,#0f172a_45%,#020617)]">
      <form onSubmit={(event) => { event.preventDefault(); authMutation.mutate(); }} className="w-full max-w-md rounded-[32px] border border-white/40 bg-white/70 p-6 shadow-2xl shadow-cyan-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/75 sm:p-8">
        <p className="text-sm uppercase tracking-[0.32em] text-cyan-600">FinTrack</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{mode === "signup" ? "Create your finance workspace" : "Modern finance command center"}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {mode === "signup"
            ? "Set up a new account and start tracking income, expenses, and donations right away."
            : "Demo credentials are prefilled so you can jump straight into the dashboard."}
        </p>
        <div className="mt-6 inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
          <button type="button" onClick={() => setMode("login")} className={cn("rounded-2xl px-4 py-2 text-sm font-medium transition-colors", mode === "login" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500")}>
            Log in
          </button>
          <button type="button" onClick={() => setMode("signup")} className={cn("rounded-2xl px-4 py-2 text-sm font-medium transition-colors", mode === "signup" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500")}>
            Sign up
          </button>
        </div>
        <div className="mt-6 space-y-4">
          {mode === "signup" ? (
            <input value={credentials.name} onChange={(event) => setCredentials((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none dark:border-slate-700 dark:bg-slate-950/80" />
          ) : null}
          <input value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none dark:border-slate-700 dark:bg-slate-950/80" />
          <input type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none dark:border-slate-700 dark:bg-slate-950/80" />
        </div>
        <button className="mt-6 w-full rounded-2xl bg-slate-950 px-4 py-3 text-white dark:bg-cyan-400 dark:text-slate-950">
          {isPending ? (mode === "signup" ? "Creating account..." : "Starting workspace...") : (mode === "signup" ? "Create account" : "Enter Dashboard")}
        </button>
      </form>
    </div>
  );
}

function DashboardView({ summary }: { summary?: DashboardSummary }) {
  const transactionsPerPage = 5;
  const [transactionPage, setTransactionPage] = useState(1);
  const chartData = useMemo(() => {
    const base = new Map<string, { month: string; income: number; expense: number; donation: number }>();
    summary?.chart.forEach((item) => {
      const current = base.get(item._id.month) ?? { month: item._id.month, income: 0, expense: 0, donation: 0 };
      current[item._id.kind] = item.total;
      base.set(item._id.month, current);
    });
    return [...base.values()];
  }, [summary]);

  const totals = summary?.totals;
  const netPosition = (totals?.totalIncome ?? 0) - (totals?.totalExpense ?? 0) - (totals?.totalDonation ?? 0);
  const recentTransactions = summary?.recentTransactions ?? [];
  const totalTransactionPages = Math.max(1, Math.ceil(recentTransactions.length / transactionsPerPage));
  const paginatedTransactions = recentTransactions.slice((transactionPage - 1) * transactionsPerPage, transactionPage * transactionsPerPage);
  const totalsChartData = [
    { label: "Income", value: totals?.totalIncome ?? 0, fill: "#06b6d4" },
    { label: "Expense", value: totals?.totalExpense ?? 0, fill: "#fb7185" },
    { label: "Net", value: Math.max(netPosition, 0), fill: "#10b981" },
  ];

  useEffect(() => {
    setTransactionPage((current) => Math.min(current, totalTransactionPages));
  }, [totalTransactionPages]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Income", value: totals?.totalIncome ?? 0, icon: Landmark, tone: "text-emerald-500", surface: "bg-emerald-500/10", note: "Last 30 days" },
          { label: "Expenses", value: totals?.totalExpense ?? 0, icon: Wallet, tone: "text-rose-500", surface: "bg-rose-500/10", note: "Last 30 days" },
          { label: "Balance", value: totals?.totalSavings ?? 0, icon: Bolt, tone: "text-amber-500", surface: "bg-amber-500/10", note: netPosition >= 0 ? "Last 30 days trend" : "Needs attention" },
          { label: "Transactions", value: recentTransactions.length, icon: Clock3, tone: "text-cyan-500", surface: "bg-cyan-500/10", note: "Logged in last 30 days" },
        ].map((item) => (
          <motion.div key={item.label} layout>
            <GlassCard className="border-slate-200/80 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{formatCurrency(item.value)}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.note}</p>
                </div>
                <div className={cn("rounded-2xl p-3", item.surface)}>
                  <item.icon className={cn("h-5 w-5", item.tone)} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <GlassCard className="border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Cashflow rhythm</p>
              <p className="text-sm text-slate-500">A clear comparison between income and expenses across the last 30 days.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-cyan-500/10 px-3 py-2 font-medium text-cyan-700 dark:text-cyan-300">Income</span>
              <span className="rounded-full bg-rose-500/10 px-3 py-2 font-medium text-rose-700 dark:text-rose-300">Expense</span>
            </div>
          </div>
          <div className="h-64 rounded-[28px] bg-slate-50/90 p-3 dark:bg-slate-950/60 sm:h-80 sm:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="income" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="income" stroke="#06b6d4" fill="url(#income)" />
                <Area type="monotone" dataKey="expense" stroke="#fb7185" fill="url(#expense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Balance breakdown</p>
                <p className="text-sm text-slate-500">A compact comparison of your last 30 day totals.</p>
              </div>
              <Wallet className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="mt-4 h-64 rounded-[28px] bg-slate-50/90 p-3 dark:bg-slate-950/60 sm:h-80 sm:p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={totalsChartData} barCategoryGap="24%">
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Bar dataKey="value" radius={[14, 14, 0, 0]}>
                    {totalsChartData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Recent activity</p>
            <p className="text-sm text-slate-500">Transactions from the last 30 days.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Page {totalTransactionPages ? transactionPage : 0} of {totalTransactionPages}
            </span>
            <Clock3 className="h-5 w-5 text-cyan-500" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {paginatedTransactions.map((item) => (
            <motion.div layout key={item._id} className="flex items-center justify-between rounded-3xl bg-slate-50/90 px-4 py-4 dark:bg-slate-950/60">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em]", transactionTone(item.kind).badge)}>{item.kind}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{formatCategoryLabel(item.category)} | {formatRecentDate(item.occurredAt)}</p>
              </div>
              <p className={cn("text-lg font-semibold", transactionTone(item.kind).amount)}>{formatCurrency(item.amount)}</p>
            </motion.div>
          ))}
        </div>
        {recentTransactions.length > transactionsPerPage ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
            <p className="text-sm text-slate-500">
              Showing {(transactionPage - 1) * transactionsPerPage + 1}-{Math.min(transactionPage * transactionsPerPage, recentTransactions.length)} of {recentTransactions.length} transactions
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTransactionPage((current) => Math.max(1, current - 1))}
                disabled={transactionPage === 1}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setTransactionPage((current) => Math.min(totalTransactionPages, current + 1))}
                disabled={transactionPage === totalTransactionPages}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-cyan-400 dark:text-slate-950"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}

function sortDonationPlans(items: DonationPlan[]) {
  return [...items].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "pending" ? -1 : 1;
    }

    return new Date(right.initiatedAt).getTime() - new Date(left.initiatedAt).getTime();
  });
}

function AdminView({
  users,
  userDrafts,
  onUserDraftChange,
  onSaveUser,
  savingUserId,
  adminTransactions,
  adminDonations,
  adminFilters,
  onAdminFiltersChange,
  onDeleteTransaction,
  deletingTransactionId,
  onUpdateDonationStatus,
  onDeleteDonation,
  mutatingDonationId,
}: {
  users: AdminUser[];
  userDrafts: Record<string, AdminUserDraft>;
  onUserDraftChange: (userId: string, field: keyof AdminUserDraft, value: string) => void;
  onSaveUser: (userId: string) => void;
  savingUserId?: string;
  adminTransactions: AdminTransaction[];
  adminDonations: AdminDonation[];
  adminFilters: { q: string; kind: string; status: string; userId: string };
  onAdminFiltersChange: (field: "q" | "kind" | "status" | "userId", value: string) => void;
  onDeleteTransaction: (id: string) => void;
  deletingTransactionId?: string;
  onUpdateDonationStatus: (id: string, status: "pending" | "completed") => void;
  onDeleteDonation: (id: string) => void;
  mutatingDonationId?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-600">Admin</p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Workspace control center</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">Update users, review platform-wide activity, and manage every transaction and donation from one place.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Users</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{users.length}</p>
          </GlassCard>
          <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Transactions</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{adminTransactions.length}</p>
          </GlassCard>
          <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Donations</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{adminDonations.length}</p>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-cyan-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Users</p>
            <p className="text-sm text-slate-500">Edit account details, currency, role, and password.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {users.map((user) => {
            const draft = userDrafts[user.id] ?? {
              name: user.name,
              email: user.email,
              currency: user.currency,
              role: user.role,
              password: "",
            };

            return (
              <div key={user.id} className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{user.role}</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input value={draft.name} onChange={(event) => onUserDraftChange(user.id, "name", event.target.value)} placeholder="Full name" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/80" />
                  <input value={draft.email} onChange={(event) => onUserDraftChange(user.id, "email", event.target.value)} placeholder="Email" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/80" />
                  <input value={draft.currency} onChange={(event) => onUserDraftChange(user.id, "currency", event.target.value)} placeholder="Currency" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm uppercase dark:border-slate-700 dark:bg-slate-950/80" />
                  <select value={draft.role} onChange={(event) => onUserDraftChange(user.id, "role", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/80">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input value={draft.password} onChange={(event) => onUserDraftChange(user.id, "password", event.target.value)} placeholder="New password (optional)" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/80 sm:col-span-2" />
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Created {formatCalendarDate(user.createdAt)}</p>
                  <button type="button" onClick={() => onSaveUser(user.id)} className="w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-cyan-400 dark:text-slate-950 sm:w-auto">
                    {savingUserId === user.id ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-cyan-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Global activity filters</p>
            <p className="text-sm text-slate-500">Filter the admin transaction and donation feeds by user, type, and search text.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select value={adminFilters.userId} onChange={(event) => onAdminFiltersChange("userId", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/80">
            <option value="all">All users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          <select value={adminFilters.kind} onChange={(event) => onAdminFiltersChange("kind", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/80">
            <option value="all">All transaction types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="donation">Donation</option>
          </select>
          <select value={adminFilters.status} onChange={(event) => onAdminFiltersChange("status", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/80">
            <option value="all">All donation statuses</option>
            <option value="pending">Pending only</option>
            <option value="completed">Completed only</option>
          </select>
          <input value={adminFilters.q} onChange={(event) => onAdminFiltersChange("q", event.target.value)} placeholder="Search title, category, or section" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/80" />
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">All transactions</p>
              <p className="text-sm text-slate-500">Every transaction across the workspace.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{adminTransactions.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {adminTransactions.length ? adminTransactions.map((item) => (
              <div key={item._id} className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em]", transactionTone(item.kind).badge)}>{item.kind}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.user?.name ?? "Unknown user"} | {item.user?.email ?? "No email"}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatCategoryLabel(item.category)} | {item.section} | {formatCalendarDate(item.occurredAt)}</p>
                    <p className={cn("mt-2 text-lg font-semibold", transactionTone(item.kind).amount)}>{formatCurrency(item.amount)}</p>
                  </div>
                  <button type="button" onClick={() => onDeleteTransaction(item._id)} className="w-full rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 dark:border-rose-800 dark:text-rose-300 sm:w-auto">
                    {deletingTransactionId === item._id ? "Removing..." : "Delete"}
                  </button>
                </div>
              </div>
            )) : (
              <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">No transactions match the current admin filters.</div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">All donations</p>
              <p className="text-sm text-slate-500">Review and manage donations across all users.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{adminDonations.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {adminDonations.length ? adminDonations.map((item) => (
              <div key={item._id} className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.user?.name ?? "Unknown user"} | {item.user?.email ?? "No email"}</p>
                    <p className="mt-1 text-sm text-slate-500">Initiated {formatCalendarDate(item.initiatedAt)}{item.completedAt ? ` | Completed ${formatCalendarDate(item.completedAt)}` : ""}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => onUpdateDonationStatus(item._id, item.status === "completed" ? "pending" : "completed")} className="w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-cyan-400 dark:text-slate-950 sm:w-auto">
                      {mutatingDonationId === item._id ? "Updating..." : item.status === "completed" ? "Move to pending" : "Mark completed"}
                    </button>
                    <button type="button" onClick={() => onDeleteDonation(item._id)} className="w-full rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 dark:border-rose-800 dark:text-rose-300 sm:w-auto">
                      {mutatingDonationId === item._id ? "Working..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">No donations match the current admin filters.</div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function DebtView({
  debts,
  draft,
  onDraftChange,
  onSubmitDebt,
  onEditDebt,
  onCancelEdit,
  editingDebtId,
  onToggleStatus,
  onDeleteDebt,
}: {
  debts: DebtItem[];
  draft: DebtDraft;
  onDraftChange: (field: keyof DebtDraft, value: string | number | "") => void;
  onSubmitDebt: () => void;
  onEditDebt: (id: string) => void;
  onCancelEdit: () => void;
  editingDebtId: string | null;
  onToggleStatus: (id: string) => void;
  onDeleteDebt: (id: string) => void;
}) {
  const activeDebts = debts.filter((item) => item.status === "active");
  const paidDebts = debts.filter((item) => item.status === "paid");
  const totalLent = activeDebts.reduce((sum, item) => sum + item.amount, 0);
  const totalRecovered = paidDebts.reduce((sum, item) => sum + item.amount, 0);
  const nextReturn = activeDebts.length
    ? [...activeDebts].sort((left, right) => new Date(left.endDate).getTime() - new Date(right.endDate).getTime())[0]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-600">Debt management</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Simple friend lending tracker</h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Keep a simple record of each lending entry, when you gave it, and when it should return.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Open loans</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{activeDebts.length}</p>
          </div>
          <div className="rounded-3xl border border-rose-200/70 bg-rose-50/70 px-4 py-3 dark:border-rose-900/30 dark:bg-rose-950/20">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300">Still out</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalLent)}</p>
          </div>
          <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Recovered</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalRecovered)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Total records", value: debts.length, icon: Wallet, tone: "text-amber-500", surface: "bg-amber-500/10" },
          { label: "Settled loans", value: paidDebts.length, icon: CheckCircle2, tone: "text-emerald-500", surface: "bg-emerald-500/10" },
          { label: "Next return", value: nextReturn ? `${nextReturn.friendName} · ${formatCalendarDate(nextReturn.endDate)}` : "No upcoming date", icon: Clock3, tone: "text-rose-500", surface: "bg-rose-500/10" },
        ].map((item) => (
          <GlassCard key={item.label} className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{item.value}</p>
              </div>
              <div className={cn("rounded-2xl p-3", item.surface)}>
                <item.icon className={cn("h-5 w-5", item.tone)} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <GlassCard className="h-fit border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70 xl:sticky xl:top-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmitDebt();
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{editingDebtId ? "Edit loan entry" : "Add loan entry"}</p>
                <p className="mt-1 text-sm text-slate-500">Just save a title, amount, given date, and expected return date.</p>
              </div>
              {editingDebtId ? (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              <input value={draft.friendName} onChange={(event) => onDraftChange("friendName", event.target.value)} placeholder="Title" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <input type="number" min="0" value={draft.amount} onChange={(event) => onDraftChange("amount", event.target.value === "" ? "" : Number(event.target.value))} placeholder="Amount" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-500">Giving date</label>
                  <input type="date" value={draft.givenDate} onChange={(event) => onDraftChange("givenDate", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-500">End date</label>
                  <input type="date" value={draft.endDate} onChange={(event) => onDraftChange("endDate", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
                </div>
              </div>
              <textarea value={draft.notes} onChange={(event) => onDraftChange("notes", event.target.value)} placeholder="Optional note" rows={3} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none dark:border-slate-700 dark:bg-slate-950/80" />
            </div>
            <button className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-white dark:bg-cyan-400 dark:text-slate-950">
              {editingDebtId ? "Update debt" : "Save debt"}
            </button>
          </form>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Open lending list</p>
                <p className="text-sm text-slate-500">See which entries are still open and when they are expected back.</p>
              </div>
              <div className="rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">
                {nextReturn ? `${nextReturn.friendName} is due on ${formatCalendarDate(nextReturn.endDate)}.` : "Add a loan to start tracking."}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {activeDebts.length ? activeDebts.map((item) => (
                <div key={item._id} className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{item.friendName}</p>
                      <p className="mt-1 text-sm text-slate-500">Given {formatCalendarDate(item.givenDate)} · return by {formatCalendarDate(item.endDate)}</p>
                      {item.notes ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.notes}</p> : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[280px]">
                      <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-900/80">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Amount</p>
                        <p className="mt-2 font-semibold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-900/80">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
                        <p className="mt-2 font-semibold text-slate-900 dark:text-white">Waiting</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => onEditDebt(item._id)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                      <span className="inline-flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </span>
                    </button>
                    <button type="button" onClick={() => onToggleStatus(item._id)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-cyan-400 dark:text-slate-950">
                      Mark returned
                    </button>
                    <button type="button" onClick={() => onDeleteDebt(item._id)} className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 dark:border-rose-800 dark:text-rose-300">
                      Delete
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">No active debts yet. Add one from the form to start your payoff plan.</div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Returned</p>
                <p className="text-sm text-slate-500">Loans that have already been paid back.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{paidDebts.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {paidDebts.length ? paidDebts.map((item) => (
                <div key={item._id} className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <p className="font-medium text-slate-900 dark:text-white">{item.friendName}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{formatCurrency(item.amount)} · returned {item.settledAt ? formatCalendarDate(item.settledAt) : "recently"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onEditDebt(item._id)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                      <span className="inline-flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </span>
                    </button>
                    <button type="button" onClick={() => onToggleStatus(item._id)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                      Move back to open
                    </button>
                    <button type="button" onClick={() => onDeleteDebt(item._id)} className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 dark:border-rose-800 dark:text-rose-300">
                      Delete
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">Paid accounts will appear here.</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function AppShell({ onLogout, user }: { onLogout: () => void; user: AuthUser | null }) {
  const queryClientLocal = useQueryClient();
  const { theme, toggle } = useThemeMode();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [filters, setFilters] = useState({ q: "", kind: "all", month: currentMonth, section: "all" });
  const [adminFilters, setAdminFilters] = useState({ q: "", kind: "all", status: "all", userId: "all" });
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [donationToRemove, setDonationToRemove] = useState<DonationPlan | null>(null);
  const [debtToRemove, setDebtToRemove] = useState<DebtItem | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [adminUserDrafts, setAdminUserDrafts] = useState<Record<string, AdminUserDraft>>({});
  const [pdfExportDraft, setPdfExportDraft] = useState<PdfExportDraft>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    sections: [],
  });
  const [debtDraft, setDebtDraft] = useState<DebtDraft>(createEmptyDebtDraft);
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>(() => createEmptyTransactionDraft());
  const [donationDraft, setDonationDraft] = useState<DonationDraft>({ title: "", amount: "", status: "pending", initiatedAt: "2026-04-06T00:00:00.000Z", completedAt: null });

  const summary = useQuery({ queryKey: ["summary"], queryFn: api.summary });
  const transactions = useQuery({ queryKey: ["transactions", filters], queryFn: () => api.transactions(new URLSearchParams(filters)) });
  const debts = useQuery({ queryKey: ["debts"], queryFn: api.debts });
  const donations = useQuery({ queryKey: ["donations"], queryFn: api.donations });
  const adminUsers = useQuery({
    queryKey: ["admin-users"],
    queryFn: api.adminUsers,
    enabled: isAdmin,
  });
  const adminTransactions = useQuery({
    queryKey: ["admin-transactions", adminFilters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (adminFilters.q) {
        params.set("q", adminFilters.q);
      }
      if (adminFilters.kind !== "all") {
        params.set("kind", adminFilters.kind);
      }
      if (adminFilters.userId !== "all") {
        params.set("userId", adminFilters.userId);
      }
      return api.adminTransactions(params);
    },
    enabled: isAdmin,
  });
  const adminDonations = useQuery({
    queryKey: ["admin-donations", adminFilters.status, adminFilters.userId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (adminFilters.status !== "all") {
        params.set("status", adminFilters.status);
      }
      if (adminFilters.userId !== "all") {
        params.set("userId", adminFilters.userId);
      }
      return api.adminDonations(params);
    },
    enabled: isAdmin,
  });

  const invalidate = () => {
    queryClientLocal.invalidateQueries({ queryKey: ["summary"] });
    queryClientLocal.invalidateQueries({ queryKey: ["transactions"] });
    queryClientLocal.invalidateQueries({ queryKey: ["debts"] });
    queryClientLocal.invalidateQueries({ queryKey: ["donations"] });
  };
  const invalidateAdmin = () => {
    queryClientLocal.invalidateQueries({ queryKey: ["admin-users"] });
    queryClientLocal.invalidateQueries({ queryKey: ["admin-transactions"] });
    queryClientLocal.invalidateQueries({ queryKey: ["admin-donations"] });
  };

  const addTransaction = useMutation({
    mutationFn: (payload: TransactionDraft) => api.addTransaction({ ...payload, amount: Number(payload.amount) }),
    onSuccess: () => {
      setQuickExpenseOpen(false);
      setEditingTransactionId(null);
      setTransactionDraft(createEmptyTransactionDraft());
      toast.success("Transaction added successfully.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const updateTransaction = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TransactionDraft }) => api.updateTransaction(id, { ...payload, amount: Number(payload.amount) }),
    onSuccess: () => {
      setQuickExpenseOpen(false);
      setEditingTransactionId(null);
      setTransactionDraft(createEmptyTransactionDraft());
      toast.success("Transaction updated successfully.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addDonation = useMutation({
    mutationFn: (payload: DonationDraft) => api.addDonation({ ...payload, amount: Number(payload.amount) }),
    onMutate: async (payload) => {
      await queryClientLocal.cancelQueries({ queryKey: ["donations"] });
      const previous = queryClientLocal.getQueryData<{ donations: DonationPlan[] }>(["donations"]);
      const optimisticDonation: DonationPlan = {
        _id: `temp-${crypto.randomUUID()}`,
        title: payload.title,
        amount: Number(payload.amount),
        status: payload.status,
        initiatedAt: payload.initiatedAt,
        completedAt: payload.status === "completed" ? payload.completedAt ?? payload.initiatedAt : null,
      };

      queryClientLocal.setQueryData<{ donations: DonationPlan[] }>(["donations"], {
        donations: sortDonationPlans([optimisticDonation, ...(previous?.donations ?? [])]),
      });

      return { previous, optimisticId: optimisticDonation._id };
    },
    onSuccess: (createdDonation, _payload, context) => {
      queryClientLocal.setQueryData<{ donations: DonationPlan[] }>(["donations"], (current) => ({
        donations: sortDonationPlans([
          createdDonation,
          ...(current?.donations ?? []).filter((item) => item._id !== context?.optimisticId && item._id !== createdDonation._id),
        ]),
      }));
      toast.success("Donation tracked successfully.");
      setDonationDraft({ title: "", amount: "", status: "pending", initiatedAt: new Date().toISOString(), completedAt: null });
      invalidate();
    },
    onError: (error: Error, _payload, context) => {
      if (context?.previous) {
        queryClientLocal.setQueryData(["donations"], context.previous);
      }
      toast.error(error.message);
    },
  });
  const addDebtMutation = useMutation({
    mutationFn: (payload: DebtDraft) =>
      api.addDebt({
        friendName: payload.friendName.trim(),
        amount: Number(payload.amount),
        givenDate: new Date(payload.givenDate).toISOString(),
        endDate: new Date(payload.endDate).toISOString(),
        notes: payload.notes.trim(),
      }),
    onSuccess: () => {
      setDebtDraft(createEmptyDebtDraft());
      toast.success("Loan entry added.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const updateDebtMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DebtDraft }) =>
      api.updateDebt(id, {
        friendName: payload.friendName.trim(),
        amount: Number(payload.amount),
        givenDate: new Date(payload.givenDate).toISOString(),
        endDate: new Date(payload.endDate).toISOString(),
        notes: payload.notes.trim(),
      }),
    onSuccess: () => {
      setEditingDebtId(null);
      setDebtDraft(createEmptyDebtDraft());
      toast.success("Loan entry updated.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const updateDebtStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DebtStatus }) => api.updateDebtStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success(variables.status === "paid" ? "Loan marked as returned." : "Loan moved back to open.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteDebtMutation = useMutation({
    mutationFn: api.deleteDebt,
    onSuccess: () => {
      setDebtToRemove(null);
      toast.success("Loan entry removed.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const updateDonationStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pending" | "completed" }) => api.updateDonationStatus(id, status),
    onSuccess: (updatedDonation, variables) => {
      queryClientLocal.setQueryData<{ donations: DonationPlan[] }>(["donations"], (current) => ({
        donations: sortDonationPlans((current?.donations ?? []).map((item) => (item._id === updatedDonation._id ? updatedDonation : item))),
      }));
      toast.success(variables.status === "completed" ? "Donation marked as completed." : "Donation moved back to pending.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteDonation = useMutation({
    mutationFn: api.deleteDonation,
    onSuccess: (_, deletedId) => {
      queryClientLocal.setQueryData<{ donations: DonationPlan[] }>(["donations"], (current) => ({
        donations: (current?.donations ?? []).filter((item) => item._id !== deletedId),
      }));
      setDonationToRemove(null);
      toast.success("Donation removed.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const bulkDelete = useMutation({ mutationFn: api.deleteTransactions, onSuccess: () => { toast.success("Selected rows deleted."); invalidate(); } });
  const updateAdminUser = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUserDraft }) =>
      api.updateAdminUser(id, {
        name: payload.name,
        email: payload.email,
        currency: payload.currency,
        role: payload.role,
        password: payload.password || undefined,
      }),
    onSuccess: (_, variables) => {
      const existing = adminUserDrafts[variables.id] ?? variables.payload;
      setAdminUserDrafts((current) => ({
        ...current,
        [variables.id]: {
          ...existing,
          password: "",
        },
      }));
      toast.success("User updated successfully.");
      invalidateAdmin();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteAdminTransaction = useMutation({
    mutationFn: api.deleteAdminTransaction,
    onSuccess: () => {
      toast.success("Transaction removed.");
      invalidateAdmin();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const updateAdminDonationStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pending" | "completed" }) => api.updateAdminDonationStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success(variables.status === "completed" ? "Donation marked as completed." : "Donation moved back to pending.");
      invalidateAdmin();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteAdminDonation = useMutation({
    mutationFn: api.deleteAdminDonation,
    onSuccess: () => {
      toast.success("Donation deleted.");
      invalidateAdmin();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const exportTransactionsPdf = useMutation({
    mutationFn: async (payload: PdfExportDraft) => {
      const params = new URLSearchParams({
        q: "",
        kind: "all",
        startDate: payload.startDate,
        endDate: payload.endDate,
      });
      for (const section of payload.sections) {
        params.append("section", section);
      }

      const rows = await api.transactions(params);
      if (!rows.length) {
        throw new Error("No transactions found for this date range and selected sections.");
      }

      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF();
      const totalIncome = rows.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
      const totalExpense = rows.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
      const dashboardBalance = summary.data?.totals?.totalSavings ?? 0;
      const selectedSectionLabel = payload.sections.length ? payload.sections.join(", ") : "all sections";

      doc.setFontSize(18);
      doc.text("Transaction Report", 14, 18);
      doc.setFontSize(10);
      doc.text(`Sections: ${selectedSectionLabel}`, 14, 28);
      doc.text(`Date range: ${payload.startDate} to ${payload.endDate}`, 14, 34);
      doc.text(`Income: ${formatCurrency(totalIncome)}`, 14, 44);
      doc.text(`Expense: ${formatCurrency(totalExpense)}`, 78, 44);
      doc.text(`Balance: ${formatCurrency(dashboardBalance)}`, 145, 44);

      autoTable(doc, {
        startY: 52,
        head: [["Date", "Title", "Section", "Type", "Amount"]],
        body: rows.map((row) => [
          formatCalendarDate(row.occurredAt),
          row.title,
          row.section,
          row.kind,
          formatCurrency(row.amount),
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42] },
        didParseCell: (hookData) => {
          if (hookData.section !== "body") {
            return;
          }

          const row = rows[hookData.row.index];
          if (!row) {
            return;
          }

          if (hookData.column.index === 4) {
            if (row.kind === "income") {
              hookData.cell.styles.textColor = [5, 150, 105];
              hookData.cell.styles.fontStyle = "bold";
            } else if (row.kind === "expense") {
              hookData.cell.styles.textColor = [225, 29, 72];
              hookData.cell.styles.fontStyle = "bold";
            }
          }

          if (hookData.column.index === 5) {
            if (row.kind === "income") {
              hookData.cell.styles.textColor = [5, 150, 105];
              hookData.cell.styles.fontStyle = "bold";
            } else if (row.kind === "expense") {
              hookData.cell.styles.textColor = [225, 29, 72];
              hookData.cell.styles.fontStyle = "bold";
            }
          }
        },
      });

      const fileSectionLabel = payload.sections.length ? payload.sections.join("-") : "all-sections";
      doc.save(`transactions-${fileSectionLabel}-${payload.startDate}-to-${payload.endDate}.pdf`);
    },
    onSuccess: () => {
      setPdfExportOpen(false);
      toast.success("PDF downloaded successfully.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClientLocal.clear();
      toast.success("Logged out.");
      onLogout();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const debtItems = debts.data?.debts ?? [];
  const donationItems = donations.data?.donations ?? [];
  const adminUserRows = adminUsers.data?.users ?? [];
  const adminTransactionRows = adminTransactions.data?.transactions ?? [];
  const adminDonationRows = adminDonations.data?.donations ?? [];

  useEffect(() => {
    if (!adminUserRows.length) {
      return;
    }

    setAdminUserDrafts((current) => {
      const nextDrafts = { ...current };

      for (const adminUser of adminUserRows) {
        nextDrafts[adminUser.id] = {
          name: current[adminUser.id]?.name ?? adminUser.name,
          email: current[adminUser.id]?.email ?? adminUser.email,
          currency: current[adminUser.id]?.currency ?? adminUser.currency,
          role: current[adminUser.id]?.role ?? adminUser.role,
          password: current[adminUser.id]?.password ?? "",
        };
      }

      return nextDrafts;
    });
  }, [adminUserRows]);

  const pendingDonations = donationItems.filter((item) => item.status === "pending");
  const completedDonations = donationItems.filter((item) => item.status === "completed");
  const trackedDonationAmount = donationItems.reduce((sum, item) => sum + item.amount, 0);
  const pendingDonationAmount = pendingDonations.reduce((sum, item) => sum + item.amount, 0);
  const completedDonationAmount = completedDonations.reduce((sum, item) => sum + item.amount, 0);
  const donationCompletionRate = donationItems.length ? Math.round((completedDonations.length / donationItems.length) * 100) : 0;
  const averageCompletedDonation = completedDonations.length ? completedDonationAmount / completedDonations.length : 0;
  const openRemoveDonationModal = (donationId: string) => {
    const donation = donationItems.find((item) => item._id === donationId);
    if (!donation) {
      toast.error("Donation not found.");
      return;
    }

    setDonationToRemove(donation);
  };
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(`${filters.month}-01T00:00:00`)),
    [filters.month],
  );
  const sectionSummary = useMemo(() => {
    const bucket = new Map<string, { section: string; income: number; expense: number; balance: number; entries: number }>();
    for (const item of transactions.data ?? []) {
      const key = item.section || "self";
      const current = bucket.get(key) ?? { section: key, income: 0, expense: 0, balance: 0, entries: 0 };
      if (item.kind === "income") {
        current.income += item.amount;
      }
      if (item.kind === "expense") {
        current.expense += item.amount;
      }
      current.balance = current.income - current.expense;
      current.entries += 1;
      bucket.set(key, current);
    }

    return [...bucket.values()].sort((left, right) => right.entries - left.entries || left.section.localeCompare(right.section));
  }, [transactions.data]);
  const totalMonthIncome = useMemo(
    () => (transactions.data ?? []).filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0),
    [transactions.data],
  );
  const totalMonthExpense = useMemo(
    () => (transactions.data ?? []).filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0),
    [transactions.data],
  );
  const availableSections = useMemo(() => {
    const sections = new Set<string>(["self", "family"]);
    for (const item of transactions.data ?? []) {
      sections.add(item.section || "self");
    }

    return [...sections];
  }, [transactions.data]);
  const togglePdfSection = (section: string) => {
    setPdfExportDraft((current) => ({
      ...current,
      sections: current.sections.includes(section)
        ? current.sections.filter((item) => item !== section)
        : [...current.sections, section],
    }));
  };
  const openQuickTransaction = (kind: TransactionKind) => {
    setEditingTransactionId(null);
    setTransactionDraft(createEmptyTransactionDraft(kind));
    setQuickExpenseOpen(true);
  };
  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction._id);
    setTransactionDraft({
      title: transaction.title,
      amount: transaction.amount,
      category: transaction.category ?? "",
      section: transaction.section,
      kind: transaction.kind,
      occurredAt: transaction.occurredAt,
    });
    setQuickExpenseOpen(true);
  };
  const closeTransactionModal = () => {
    setQuickExpenseOpen(false);
    setEditingTransactionId(null);
    setTransactionDraft(createEmptyTransactionDraft());
  };
  const handleAdminUserDraftChange = (userId: string, field: keyof AdminUserDraft, value: string) => {
    setAdminUserDrafts((current) => {
      const existingUser = adminUserRows.find((item) => item.id === userId);
      const currentDraft = current[userId] ?? {
        name: existingUser?.name ?? "",
        email: existingUser?.email ?? "",
        currency: existingUser?.currency ?? "BDT",
        role: existingUser?.role ?? "user",
        password: "",
      };

      return {
        ...current,
        [userId]: {
          ...currentDraft,
          [field]: field === "role" ? (value as "user" | "admin") : value,
        },
      };
    });
  };
  const saveAdminUser = (userId: string) => {
    const existingUser = adminUserRows.find((item) => item.id === userId);
    if (!existingUser) {
      toast.error("User not found.");
      return;
    }

    const draft = adminUserDrafts[userId] ?? {
      name: existingUser.name,
      email: existingUser.email,
      currency: existingUser.currency,
      role: existingUser.role,
      password: "",
    };

    updateAdminUser.mutate({ id: userId, payload: draft });
  };
  const handleDebtDraftChange = (field: keyof DebtDraft, value: string | number | "") => {
    setDebtDraft((current) => ({ ...current, [field]: value }));
  };
  const submitDebt = () => {
    if (!debtDraft.friendName.trim()) {
      toast.error("Add a title.");
      return;
    }

    if (debtDraft.amount === "" || !debtDraft.givenDate || !debtDraft.endDate) {
      toast.error("Add amount, giving date, and end date.");
      return;
    }

    if (debtDraft.givenDate > debtDraft.endDate) {
      toast.error("Giving date must be before end date.");
      return;
    }

    if (editingDebtId) {
      updateDebtMutation.mutate({ id: editingDebtId, payload: debtDraft });
      return;
    }

    addDebtMutation.mutate(debtDraft);
  };
  const openEditDebt = (id: string) => {
    const debt = debtItems.find((item) => item._id === id);
    if (!debt) {
      toast.error("Loan entry not found.");
      return;
    }

    setEditingDebtId(id);
    setDebtDraft({
      friendName: debt.friendName,
      amount: debt.amount,
      givenDate: debt.givenDate.slice(0, 10),
      endDate: debt.endDate.slice(0, 10),
      notes: debt.notes,
    });
  };
  const cancelDebtEdit = () => {
    setEditingDebtId(null);
    setDebtDraft(createEmptyDebtDraft());
  };
  const toggleDebtStatus = (id: string) => {
    const debt = debtItems.find((item) => item._id === id);
    if (!debt) {
      toast.error("Loan entry not found.");
      return;
    }

    updateDebtStatus.mutate({ id, status: debt.status === "active" ? "paid" : "active" });
  };
  const openRemoveDebtModal = (id: string) => {
    const debt = debtItems.find((item) => item._id === id);
    if (!debt) {
      toast.error("Loan entry not found.");
      return;
    }

    setDebtToRemove(debt);
  };
  const deleteDebt = (id: string) => {
    deleteDebtMutation.mutate(id);
  };
  const navItems = [{ to: "/", label: "Dashboard", icon: Landmark }, { to: "/transactions", label: "Transactions", icon: Wallet }, { to: "/debts", label: "Debts", icon: Target }, { to: "/donations", label: "Donations", icon: HeartHandshake }, ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : [])];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,#f8fafc,#dbeafe_45%,#f8fafc)] text-slate-900 transition-colors dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(135deg,#020617,#0f172a_45%,#020617)] dark:text-white">
      <Toaster richColors position="top-right" />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onQuickExpense={() => openQuickTransaction("expense")} />
      <div className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:p-6">
        <div className="space-y-3 lg:hidden">
          <div className="rounded-[28px] border border-white/35 bg-white/55 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-600">FinTrack</p>
                <h1 className="mt-2 text-xl font-semibold">BDT Console</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user?.name ?? "Guest user"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={toggle} className="rounded-full border border-white/30 p-2.5 dark:border-white/10" aria-label="Toggle theme">
                  {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => void logout.mutateAsync()} className="rounded-full border border-white/30 p-2.5 dark:border-white/10" aria-label="Log out">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => openQuickTransaction("income")} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                Add income
              </button>
              <button type="button" onClick={() => openQuickTransaction("expense")} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white dark:bg-cyan-400 dark:text-slate-950">
                Add expense
              </button>
            </div>
          </div>

          <button type="button" onClick={() => setPaletteOpen(true)} className="flex w-full items-center gap-3 rounded-[24px] border border-white/35 bg-white/65 px-4 py-3.5 text-sm text-slate-500 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-400">
            <Search className="h-4 w-4" />
            Quick jump
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-[11px] dark:bg-slate-800">Ctrl+K</span>
          </button>
        </div>

        <div className="mt-4 grid min-h-screen gap-4 lg:mt-0 lg:grid-cols-[280px_1fr] lg:gap-6">
        <aside className="hidden rounded-[32px] border border-white/35 bg-white/50 p-4 shadow-2xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/45 sm:p-5 lg:block">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-600">FinTrack</p>
              <h1 className="mt-2 text-xl font-semibold sm:text-2xl">BDT Console</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{user?.name ?? "Guest user"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggle} className="rounded-full border border-white/30 p-2 dark:border-white/10" aria-label="Toggle theme">
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => void logout.mutateAsync()} className="rounded-full border border-white/30 p-2 dark:border-white/10" aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button type="button" onClick={() => setPaletteOpen(true)} className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-400">
            <Search className="h-4 w-4" />
            Quick jump
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">Ctrl+K</span>
          </button>

          <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors", isActive ? "bg-slate-950 text-white dark:bg-cyan-400 dark:text-slate-950" : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800/70")}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-[28px] bg-slate-950 p-5 text-white dark:bg-slate-50 dark:text-slate-950">
            <p className="text-sm font-semibold">Loan snapshot</p>
            <p className="mt-2 text-sm opacity-80">
              {debtItems.filter((item) => item.status === "active").length} open loans and {formatCurrency(debtItems.filter((item) => item.status === "active").reduce((sum, item) => sum + item.amount, 0))} still out
            </p>
          </div>
        </aside>

        <main className="space-y-5 pb-24 lg:space-y-6 lg:pb-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-600">April 2026</p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Money, mission, and momentum</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={() => openQuickTransaction("income")} className="w-full rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 sm:w-auto">
                Add income
              </button>
              <button type="button" onClick={() => openQuickTransaction("expense")} className="w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-cyan-400 dark:text-slate-950 sm:w-auto">
                Add expense
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
              <Routes location={location}>
                <Route path="/" element={<DashboardView summary={summary.data} />} />
                <Route path="/transactions" element={
                  <div className="space-y-6">
                    <GlassCard className="overflow-hidden">
                      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Income and Expense Planner</p>
                          <p className="mt-1 text-sm text-slate-500">See everything for one month and break it into sections like self, family, or any custom section you create.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <input type="month" value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))} className="rounded-2xl border border-white/30 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70" />
                          <select value={filters.section} onChange={(event) => setFilters((current) => ({ ...current, section: event.target.value }))} className="rounded-2xl border border-white/30 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                            <option value="all">All sections</option>
                            {availableSections.map((section) => (
                              <option key={section} value={section}>{section}</option>
                            ))}
                          </select>
                          <select value={filters.kind} onChange={(event) => setFilters((current) => ({ ...current, kind: event.target.value }))} className="rounded-2xl border border-white/30 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                            <option value="all">Income and expense</option>
                            <option value="income">Income only</option>
                            <option value="expense">Expense only</option>
                          </select>
                          <input placeholder="Search title, category, or section" value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} className="rounded-2xl border border-white/30 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70" />
                        </div>
                      </div>
                    </GlassCard>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {[
                        { label: `${monthLabel} income`, value: totalMonthIncome, icon: ArrowUpCircle, tone: "text-emerald-500" },
                        { label: `${monthLabel} expense`, value: totalMonthExpense, icon: ArrowDownCircle, tone: "text-rose-500" },
                        { label: "Balance", value: summary.data?.totals?.totalSavings ?? 0, icon: Bolt, tone: "text-amber-500" },
                      ].map((item) => (
                        <GlassCard key={item.label}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">{item.label}</p>
                              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{formatCurrency(item.value)}</p>
                            </div>
                            <item.icon className={cn("h-6 w-6", item.tone)} />
                          </div>
                        </GlassCard>
                      ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                      {sectionSummary.map((section) => (
                        <GlassCard key={section.section}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">Section</p>
                              <h3 className="mt-1 text-2xl font-semibold capitalize text-slate-900 dark:text-white">{section.section}</h3>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">{section.entries} entries</span>
                          </div>
                          <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl bg-emerald-500/10 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Income</p>
                              <p className="mt-2 font-semibold text-slate-900 dark:text-white">{formatCurrency(section.income)}</p>
                            </div>
                            <div className="rounded-2xl bg-rose-500/10 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300">Expense</p>
                              <p className="mt-2 font-semibold text-slate-900 dark:text-white">{formatCurrency(section.expense)}</p>
                            </div>
                            <div className="rounded-2xl bg-cyan-500/10 p-3">
                              <p className="text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Balance</p>
                              <p className="mt-2 font-semibold text-slate-900 dark:text-white">{formatCurrency(section.balance)}</p>
                            </div>
                          </div>
                        </GlassCard>
                      ))}
                    </div>

                    <TransactionTable
                      rows={transactions.data ?? []}
                      loading={transactions.isLoading}
                      onDeleteSelected={(ids) => ids.length && bulkDelete.mutate(ids)}
                      onEditTransaction={openEditTransaction}
                      onRemoveDonation={openRemoveDonationModal}
                      onExportPdf={() => setPdfExportOpen(true)}
                    />
                  </div>
                } />
                <Route path="/debts" element={
                  <DebtView
                    debts={debtItems}
                    draft={debtDraft}
                    onDraftChange={handleDebtDraftChange}
                    onSubmitDebt={submitDebt}
                    onEditDebt={openEditDebt}
                    onCancelEdit={cancelDebtEdit}
                    editingDebtId={editingDebtId}
                    onToggleStatus={toggleDebtStatus}
                    onDeleteDebt={openRemoveDebtModal}
                  />
                } />
                <Route path="/donations" element={
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-cyan-600">Donations</p>
                        <h3 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Simple giving tracker</h3>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                          See what is pending, what is completed, and the total amount moving through your donation workflow.
                        </p>
                      </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-3xl border border-emerald-200/60 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Completion rate</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{donationCompletionRate}%</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Average completed</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(averageCompletedDonation)}</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Momentum</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{completedDonations.length >= pendingDonations.length ? "Strong" : "Growing"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      {[
                        { label: "Tracked donations", value: donationItems.length, icon: HeartHandshake, tone: "text-cyan-500", surface: "bg-cyan-500/10" },
                        { label: "Pending", value: pendingDonations.length, icon: Clock3, tone: "text-amber-500", surface: "bg-amber-500/10" },
                        { label: "Pending amount", value: formatCurrency(pendingDonationAmount), icon: Clock3, tone: "text-amber-500", surface: "bg-amber-500/10" },
                        { label: "Completed", value: completedDonations.length, icon: CheckCircle2, tone: "text-emerald-500", surface: "bg-emerald-500/10" },
                        { label: "Completed amount", value: formatCurrency(completedDonationAmount), icon: Bolt, tone: "text-emerald-500", surface: "bg-cyan-500/10" },
                      ].map((item) => (
                        <GlassCard key={item.label} className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">{item.label}</p>
                              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{item.value}</p>
                            </div>
                            <div className={cn("rounded-2xl p-3", item.surface)}>
                              <item.icon className={cn("h-5 w-5", item.tone)} />
                            </div>
                          </div>
                        </GlassCard>
                      ))}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
                      <GlassCard className="h-fit border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70 xl:sticky xl:top-6">
                        <form onSubmit={(event) => {
                          event.preventDefault();
                          addDonation.mutate({
                            ...donationDraft,
                            completedAt: donationDraft.status === "completed" ? donationDraft.completedAt ?? donationDraft.initiatedAt : null,
                          });
                        }}>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Add donation</p>
                          <p className="mt-1 text-sm text-slate-500">Create a record and update it as the donation moves from pending to completed.</p>
                          <div className="mt-4 space-y-3">
                            <input value={donationDraft.title} onChange={(event) => setDonationDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Donation title" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
                            <input type="number" value={donationDraft.amount} onChange={(event) => setDonationDraft((current) => ({ ...current, amount: event.target.value === "" ? "" : Number(event.target.value) }))} placeholder="Amount" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
                            <select value={donationDraft.status} onChange={(event) => setDonationDraft((current) => ({ ...current, status: event.target.value as "pending" | "completed", completedAt: event.target.value === "completed" ? current.completedAt ?? current.initiatedAt : null }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80">
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                            </select>
                            <div>
                              <label className="mb-2 block text-sm text-slate-500">Initiated date</label>
                              <input type="date" value={donationDraft.initiatedAt.slice(0, 10)} onChange={(event) => setDonationDraft((current) => ({ ...current, initiatedAt: new Date(event.target.value).toISOString() }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
                            </div>
                            {donationDraft.status === "completed" ? (
                              <div>
                                <label className="mb-2 block text-sm text-slate-500">Completed date</label>
                                <input type="date" value={(donationDraft.completedAt ?? donationDraft.initiatedAt).slice(0, 10)} onChange={(event) => setDonationDraft((current) => ({ ...current, completedAt: new Date(event.target.value).toISOString() }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                            Total tracked amount: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(trackedDonationAmount)}</span>
                          </div>
                          <button className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-white dark:bg-cyan-400 dark:text-slate-950">
                            {addDonation.isPending ? "Saving donation..." : "Save donation"}
                          </button>
                        </form>
                      </GlassCard>

                      <div className="space-y-6">
                        <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Pending donations</p>
                              <p className="text-sm text-slate-500">Active donations that are still waiting to be completed.</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{pendingDonations.length}</span>
                              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(pendingDonationAmount)}</p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-3">
                            {pendingDonations.length ? pendingDonations.map((plan) => (
                              <div key={plan._id} className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Pending</span>
                                      <p className="font-medium text-slate-900 dark:text-white">{plan.title}</p>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">Initiated: {formatCalendarDate(plan.initiatedAt)}</p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(plan.amount)}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => updateDonationStatus.mutate({ id: plan._id, status: "completed" })} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-cyan-400 dark:text-slate-950">
                                      Mark completed
                                    </button>
                                    <button type="button" onClick={() => openRemoveDonationModal(plan._id)} className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 dark:border-rose-800 dark:text-rose-300">
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )) : (
                              <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">No pending donations right now.</div>
                            )}
                          </div>
                        </GlassCard>

                        <GlassCard className="border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Completed donations</p>
                              <p className="text-sm text-slate-500">Finished donations with their initiated and completed dates.</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{completedDonations.length}</span>
                              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(completedDonationAmount)}</p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-3">
                            {completedDonations.length ? completedDonations.map((plan) => (
                              <div key={plan._id} className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Completed</span>
                                      <p className="font-medium text-slate-900 dark:text-white">{plan.title}</p>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">Initiated: {formatCalendarDate(plan.initiatedAt)}</p>
                                    <p className="text-sm text-slate-500">Completed: {plan.completedAt ? formatCalendarDate(plan.completedAt) : "Not set"}</p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(plan.amount)}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => updateDonationStatus.mutate({ id: plan._id, status: "pending" })} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                                      Move to pending
                                    </button>
                                    <button type="button" onClick={() => openRemoveDonationModal(plan._id)} className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 dark:border-rose-800 dark:text-rose-300">
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )) : (
                              <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">Completed donations will appear here.</div>
                            )}
                          </div>
                        </GlassCard>
                      </div>
                    </div>
                  </div>
                } />
                {isAdmin ? (
                  <Route
                    path="/admin"
                    element={
                      <AdminView
                        users={adminUserRows}
                        userDrafts={adminUserDrafts}
                        onUserDraftChange={handleAdminUserDraftChange}
                        onSaveUser={saveAdminUser}
                        savingUserId={updateAdminUser.variables?.id}
                        adminTransactions={adminTransactionRows}
                        adminDonations={adminDonationRows}
                        adminFilters={adminFilters}
                        onAdminFiltersChange={(field, value) => setAdminFilters((current) => ({ ...current, [field]: value }))}
                        onDeleteTransaction={(id) => deleteAdminTransaction.mutate(id)}
                        deletingTransactionId={deleteAdminTransaction.variables}
                        onUpdateDonationStatus={(id, status) => updateAdminDonationStatus.mutate({ id, status })}
                        onDeleteDonation={(id) => deleteAdminDonation.mutate(id)}
                        mutatingDonationId={updateAdminDonationStatus.variables?.id ?? deleteAdminDonation.variables}
                      />
                    }
                  />
                ) : null}
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/90 lg:hidden">
          <div className="mx-auto grid max-w-xl grid-flow-col auto-cols-fr gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium transition-colors",
                    isActive
                      ? "bg-slate-950 text-white dark:bg-cyan-400 dark:text-slate-950"
                      : "text-slate-500 dark:text-slate-400",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {quickExpenseOpen ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4" onClick={closeTransactionModal}>
          <div className="mx-auto my-4 max-w-lg rounded-[32px] border border-white/30 bg-white/80 p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900/90 sm:my-12 sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{editingTransactionId ? "Edit transaction" : "New transaction"}</h3>
              <button type="button" onClick={closeTransactionModal} className="text-sm text-slate-500">Close</button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (editingTransactionId) {
                  updateTransaction.mutate({ id: editingTransactionId, payload: transactionDraft });
                  return;
                }

                addTransaction.mutate(transactionDraft);
              }}
            >
              <input value={transactionDraft.title} onChange={(event) => setTransactionDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <input type="number" value={transactionDraft.amount} onChange={(event) => setTransactionDraft((current) => ({ ...current, amount: event.target.value === "" ? "" : Number(event.target.value) }))} placeholder="Amount in BDT" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <input value={transactionDraft.category ?? ""} onChange={(event) => setTransactionDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Category (optional)" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <input value={transactionDraft.section} onChange={(event) => setTransactionDraft((current) => ({ ...current, section: event.target.value.toLowerCase() || "family" }))} placeholder="Section like self or family" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <select value={transactionDraft.kind} onChange={(event) => setTransactionDraft((current) => ({ ...current, kind: event.target.value as TransactionKind }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="donation">Donation</option>
              </select>
              <input type="date" value={transactionDraft.occurredAt.slice(0, 10)} onChange={(event) => setTransactionDraft((current) => ({ ...current, occurredAt: new Date(event.target.value).toISOString() }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-white dark:bg-cyan-400 dark:text-slate-950">
                {editingTransactionId ? "Update transaction" : "Save transaction"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {pdfExportOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4" onClick={() => setPdfExportOpen(false)}>
          <div className="mx-auto my-4 max-w-md rounded-[32px] border border-white/30 bg-white/90 p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900/95 sm:my-12 sm:p-6" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-600">Export PDF</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">Download transaction report</h3>
            <p className="mt-2 text-sm text-slate-500">Choose a date range and a section like family or self.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-500">Start date</label>
                <input type="date" value={pdfExportDraft.startDate} onChange={(event) => setPdfExportDraft((current) => ({ ...current, startDate: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-500">End date</label>
                <input type="date" value={pdfExportDraft.endDate} onChange={(event) => setPdfExportDraft((current) => ({ ...current, endDate: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-500">Sections</label>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-950/80">
                  <button
                    type="button"
                    onClick={() => setPdfExportDraft((current) => ({ ...current, sections: [] }))}
                    className={cn(
                      "mb-3 inline-flex rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                      pdfExportDraft.sections.length === 0
                        ? "bg-slate-950 text-white dark:bg-cyan-400 dark:text-slate-950"
                        : "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200",
                    )}
                  >
                    All sections
                  </button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availableSections.map((section) => {
                      const selected = pdfExportDraft.sections.includes(section);
                      return (
                        <button
                          key={section}
                          type="button"
                          onClick={() => togglePdfSection(section)}
                          className={cn(
                            "flex items-center justify-between rounded-2xl border px-3 py-2 text-sm font-medium transition-colors",
                            selected
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                              : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200",
                          )}
                        >
                          <span className="capitalize">{section}</span>
                          <span className={cn("h-4 w-4 rounded border", selected ? "border-cyan-500 bg-cyan-500" : "border-slate-300 dark:border-slate-600")} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {pdfExportDraft.sections.length
                      ? `Selected: ${pdfExportDraft.sections.join(", ")}`
                      : "No specific section selected, so the PDF will include all sections."}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <button type="button" onClick={() => setPdfExportOpen(false)} className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200 sm:w-auto">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!pdfExportDraft.startDate || !pdfExportDraft.endDate) {
                    toast.error("Please choose both start and end dates.");
                    return;
                  }
                  if (pdfExportDraft.startDate > pdfExportDraft.endDate) {
                    toast.error("Start date must be before end date.");
                    return;
                  }
                  exportTransactionsPdf.mutate(pdfExportDraft);
                }}
                className="w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-cyan-400 dark:text-slate-950 sm:w-auto"
              >
                {exportTransactionsPdf.isPending ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {donationToRemove ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4" onClick={() => setDonationToRemove(null)}>
          <div className="mx-auto my-4 max-w-md rounded-[32px] border border-white/30 bg-white/90 p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900/95 sm:my-12 sm:p-6" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm uppercase tracking-[0.24em] text-rose-500">Confirm removal</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">Remove this donation?</h3>
            <p className="mt-3 text-sm text-slate-500">
              <span className="font-medium text-slate-900 dark:text-white">{donationToRemove.title}</span>
              {" "}for {formatCurrency(donationToRemove.amount)} will be deleted from your donation tracker.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <button type="button" onClick={() => setDonationToRemove(null)} className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200 sm:w-auto">
                Cancel
              </button>
              <button type="button" onClick={() => deleteDonation.mutate(donationToRemove._id)} className="w-full rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white sm:w-auto">
                {deleteDonation.isPending ? "Removing..." : "Remove donation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {debtToRemove ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4" onClick={() => setDebtToRemove(null)}>
          <div className="mx-auto my-4 max-w-md rounded-[32px] border border-white/30 bg-white/90 p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900/95 sm:my-12 sm:p-6" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm uppercase tracking-[0.24em] text-rose-500">Confirm removal</p>
            <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">Remove this loan entry?</h3>
            <p className="mt-3 text-sm text-slate-500">
              <span className="font-medium text-slate-900 dark:text-white">{debtToRemove.friendName}</span>
              {" "}for {formatCurrency(debtToRemove.amount)} will be deleted from your lending tracker.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <button type="button" onClick={() => setDebtToRemove(null)} className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200 sm:w-auto">
                Cancel
              </button>
              <button type="button" onClick={() => deleteDebt(debtToRemove._id)} className="w-full rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white sm:w-auto">
                Remove loan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RoutedApp() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    void api.me()
      .then((data) => {
        if (!active) {
          return;
        }

        setUser(data.user);
        setReady(true);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setUser(null);
        setReady(false);
      })
      .finally(() => {
        if (active) {
          setCheckingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <LoginGate ready={ready} checkingSession={checkingSession} onAuthenticated={(authenticatedUser) => { setUser(authenticatedUser); setReady(true); }}>
      <AppShell onLogout={() => { setUser(null); setReady(false); }} user={user} />
    </LoginGate>
  );
}

export default function App() {
  return <QueryClientProvider client={queryClient}><RoutedApp /></QueryClientProvider>;
}
