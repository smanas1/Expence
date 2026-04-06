import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownCircle, ArrowUpCircle, Bolt, CheckCircle2, Clock3, HeartHandshake, Landmark, LogOut, Moon, Search, SunMedium, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Toaster, toast } from "sonner";

import { CommandPalette } from "./components/command-palette";
import { TransactionTable } from "./components/transaction-table";
import { api } from "./lib/api";
import { formatCalendarDate, formatCurrency, formatRecentDate } from "./lib/format";
import { cn } from "./lib/utils";
import type { DashboardSummary, DonationPlan, Transaction, TransactionKind } from "./types";

const queryClient = new QueryClient();
type DonationDraft = { title: string; amount: number; status: "pending" | "completed"; initiatedAt: string; completedAt: string | null };
type TransactionDraft = Omit<Transaction, "_id" | "amount"> & { amount: number | "" };
type PdfExportDraft = { startDate: string; endDate: string; section: string };

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
    <div className={cn("rounded-[28px] border border-white/30 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70", className)}>
      {children}
    </div>
  );
}

function LoginGate({ children, ready, onAuthenticated, autoLogin = false }: { children: ReactNode; ready: boolean; onAuthenticated: () => void; autoLogin?: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [credentials, setCredentials] = useState({ name: "Anas Rahman", email: "demo@fintrack.app", password: "demo1234" });
  const authMutation = useMutation({
    mutationFn: () =>
      mode === "signup"
        ? api.signup({ name: credentials.name, email: credentials.email, password: credentials.password })
        : api.login(credentials.email, credentials.password),
    onSuccess: () => {
      onAuthenticated();
      toast.success(mode === "signup" ? "Account created successfully." : "Signed in successfully.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const { mutate: triggerAuth, isPending } = authMutation;

  useEffect(() => {
    if (autoLogin) {
      triggerAuth();
    }
  }, [autoLogin, triggerAuth]);

  if (ready) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_35%),linear-gradient(135deg,#f8fafc,#dbeafe_45%,#f8fafc)] px-4 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.15),_transparent_35%),linear-gradient(135deg,#020617,#0f172a_45%,#020617)]">
      <form onSubmit={(event) => { event.preventDefault(); authMutation.mutate(); }} className="w-full max-w-md rounded-[32px] border border-white/40 bg-white/70 p-8 shadow-2xl shadow-cyan-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/75">
        <p className="text-sm uppercase tracking-[0.32em] text-cyan-600">FinTrack</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{mode === "signup" ? "Create your finance workspace" : "Modern finance command center"}</h1>
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
  const recentDonation = summary?.recentTransactions.find((item) => item.kind === "donation");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Income", value: totals?.totalIncome ?? 0, icon: Landmark, tone: "text-emerald-500", surface: "bg-emerald-500/10", note: "All inflows tracked" },
          { label: "Expenses", value: totals?.totalExpense ?? 0, icon: Wallet, tone: "text-rose-500", surface: "bg-rose-500/10", note: "Outgoings across sections" },
          { label: "Donations", value: totals?.totalDonation ?? 0, icon: HeartHandshake, tone: "text-cyan-500", surface: "bg-cyan-500/10", note: recentDonation ? `Latest: ${recentDonation.title}` : "No recent donation activity" },
          { label: "Savings", value: totals?.totalSavings ?? 0, icon: Bolt, tone: "text-amber-500", surface: "bg-amber-500/10", note: netPosition >= 0 ? "Positive direction" : "Needs attention" },
        ].map((item) => (
          <motion.div key={item.label} layout>
            <GlassCard className="border-slate-200/80 bg-white/80 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{formatCurrency(item.value)}</p>
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
              <p className="text-sm text-slate-500">A clear comparison between income and expenses across the recent timeline.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-cyan-500/10 px-3 py-2 font-medium text-cyan-700 dark:text-cyan-300">Income</span>
              <span className="rounded-full bg-rose-500/10 px-3 py-2 font-medium text-rose-700 dark:text-rose-300">Expense</span>
            </div>
          </div>
          <div className="h-80 rounded-[28px] bg-slate-50/90 p-4 dark:bg-slate-950/60">
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
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Monthly budgets</p>
                <p className="text-sm text-slate-500">Quick progress by category.</p>
              </div>
              <Wallet className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="mt-4 space-y-4">
              {summary?.budgets?.map((budget) => {
                const progress = Math.min(100, Math.round(((budget.spent ?? 0) / budget.limit) * 100));
                return (
                  <div key={`${budget.category}-${budget.month}`} className="rounded-3xl bg-slate-50/90 p-4 dark:bg-slate-950/60">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{budget.category}</span>
                      <span className="text-slate-500">{progress}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className={cn("h-full rounded-full", progress >= 80 ? "bg-rose-500" : "bg-cyan-500")} style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">{formatCurrency(budget.spent ?? 0)} spent of {formatCurrency(budget.limit)}</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="border-slate-200/80 bg-white/85 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Recent activity</p>
            <p className="text-sm text-slate-500">Latest transactions across your workspace.</p>
          </div>
          <Clock3 className="h-5 w-5 text-cyan-500" />
        </div>
        <div className="mt-4 space-y-3">
          {summary?.recentTransactions.map((item) => (
            <motion.div layout key={item._id} className="flex items-center justify-between rounded-3xl bg-slate-50/90 px-4 py-4 dark:bg-slate-950/60">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.kind}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.category} | {formatRecentDate(item.occurredAt)}</p>
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</p>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function AppShell({ onLogout }: { onLogout: () => void }) {
  const queryClientLocal = useQueryClient();
  const { theme, toggle } = useThemeMode();
  const location = useLocation();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [filters, setFilters] = useState({ q: "", kind: "all", month: currentMonth, section: "all" });
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [donationToRemove, setDonationToRemove] = useState<DonationPlan | null>(null);
  const [pdfExportDraft, setPdfExportDraft] = useState<PdfExportDraft>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    section: "all",
  });
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>({ title: "", amount: "", category: "Food", section: "family", kind: "expense", occurredAt: new Date().toISOString() });
  const [donationDraft, setDonationDraft] = useState<DonationDraft>({ title: "Community support", amount: 3000, status: "pending", initiatedAt: "2026-04-06T00:00:00.000Z", completedAt: null });

  const summary = useQuery({ queryKey: ["summary"], queryFn: api.summary });
  const transactions = useQuery({ queryKey: ["transactions", filters], queryFn: () => api.transactions(new URLSearchParams(filters)) });
  const donations = useQuery({ queryKey: ["donations"], queryFn: api.donations });

  const invalidate = () => {
    queryClientLocal.invalidateQueries({ queryKey: ["summary"] });
    queryClientLocal.invalidateQueries({ queryKey: ["transactions"] });
    queryClientLocal.invalidateQueries({ queryKey: ["donations"] });
  };

  const addTransaction = useMutation({
    mutationFn: (payload: TransactionDraft) => api.addTransaction({ ...payload, amount: Number(payload.amount) }),
    onSuccess: () => {
      setQuickExpenseOpen(false);
      setTransactionDraft({ title: "", amount: "", category: "Food", section: "family", kind: "expense", occurredAt: new Date().toISOString() });
      toast.success("Transaction added successfully.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addDonation = useMutation({
    mutationFn: api.addDonation,
    onSuccess: () => {
      toast.success("Donation tracked successfully.");
      setDonationDraft({ title: "Community support", amount: 3000, status: "pending", initiatedAt: new Date().toISOString(), completedAt: null });
      invalidate();
    },
  });
  const updateDonationStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pending" | "completed" }) => api.updateDonationStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success(variables.status === "completed" ? "Donation marked as completed." : "Donation moved back to pending.");
      invalidate();
    },
  });
  const deleteDonation = useMutation({
    mutationFn: api.deleteDonation,
    onSuccess: () => {
      setDonationToRemove(null);
      toast.success("Donation removed.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const bulkDelete = useMutation({ mutationFn: api.deleteTransactions, onSuccess: () => { toast.success("Selected rows deleted."); invalidate(); } });
  const exportTransactionsPdf = useMutation({
    mutationFn: async (payload: PdfExportDraft) => {
      const params = new URLSearchParams({
        q: "",
        kind: "all",
        startDate: payload.startDate,
        endDate: payload.endDate,
      });
      if (payload.section !== "all") {
        params.set("section", payload.section);
      }

      const rows = await api.transactions(params);
      if (!rows.length) {
        throw new Error("No transactions found for this date range and section.");
      }

      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF();
      const totalIncome = rows.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
      const totalExpense = rows.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
      const totalDonation = rows.filter((item) => item.kind === "donation").reduce((sum, item) => sum + item.amount, 0);

      doc.setFontSize(18);
      doc.text("Transaction Report", 14, 18);
      doc.setFontSize(10);
      doc.text(`Section: ${payload.section === "all" ? "all sections" : payload.section}`, 14, 28);
      doc.text(`Date range: ${payload.startDate} to ${payload.endDate}`, 14, 34);
      doc.text(`Income: ${formatCurrency(totalIncome)}`, 14, 44);
      doc.text(`Expense: ${formatCurrency(totalExpense)}`, 78, 44);
      doc.text(`Donation: ${formatCurrency(totalDonation)}`, 145, 44);

      autoTable(doc, {
        startY: 52,
        head: [["Date", "Title", "Category", "Section", "Type", "Amount"]],
        body: rows.map((row) => [
          formatCalendarDate(row.occurredAt),
          row.title,
          row.category,
          row.section,
          row.kind,
          formatCurrency(row.amount),
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42] },
      });

      doc.save(`transactions-${payload.section}-${payload.startDate}-to-${payload.endDate}.pdf`);
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

  const donationItems = donations.data?.donations ?? [];
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
  const openQuickTransaction = (kind: TransactionKind) => {
    setTransactionDraft({
      title: "",
      amount: "",
      category: kind === "income" ? "Salary" : kind === "donation" ? "Donation" : "Food",
      section: kind === "income" ? "self" : "family",
      kind,
      occurredAt: new Date().toISOString(),
    });
    setQuickExpenseOpen(true);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,#f8fafc,#dbeafe_45%,#f8fafc)] text-slate-900 transition-colors dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(135deg,#020617,#0f172a_45%,#020617)] dark:text-white">
      <Toaster richColors position="top-right" />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onQuickExpense={() => setQuickExpenseOpen(true)} />
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 p-4 lg:grid-cols-[280px_1fr] lg:p-6">
        <aside className="rounded-[32px] border border-white/35 bg-white/50 p-5 shadow-2xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/45">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-600">FinTrack</p>
              <h1 className="mt-2 text-2xl font-semibold">BDT Console</h1>
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

          <nav className="mt-6 space-y-2">
            {[{ to: "/", label: "Dashboard", icon: Landmark }, { to: "/transactions", label: "Transactions", icon: Wallet }, { to: "/donations", label: "Donations", icon: HeartHandshake }].map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors", isActive ? "bg-slate-950 text-white dark:bg-cyan-400 dark:text-slate-950" : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800/70")}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-[28px] bg-slate-950 p-5 text-white dark:bg-slate-50 dark:text-slate-950">
            <p className="text-sm font-semibold">Donation tracker</p>
            <p className="mt-2 text-sm opacity-80">{pendingDonations.length} pending and {completedDonations.length} completed</p>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-600">April 2026</p>
              <h2 className="mt-2 text-3xl font-semibold">Money, mission, and momentum</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => openQuickTransaction("income")} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                Add income
              </button>
              <button type="button" onClick={() => openQuickTransaction("expense")} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-cyan-400 dark:text-slate-950">
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
                        <div className="grid gap-3 md:grid-cols-4">
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

                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        { label: `${monthLabel} income`, value: totalMonthIncome, icon: ArrowUpCircle, tone: "text-emerald-500" },
                        { label: `${monthLabel} expense`, value: totalMonthExpense, icon: ArrowDownCircle, tone: "text-rose-500" },
                        { label: `${monthLabel} balance`, value: totalMonthIncome - totalMonthExpense, icon: Wallet, tone: "text-cyan-500" },
                      ].map((item) => (
                        <GlassCard key={item.label}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">{item.label}</p>
                              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{formatCurrency(item.value)}</p>
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
                      onRemoveDonation={openRemoveDonationModal}
                      onExportPdf={() => setPdfExportOpen(true)}
                    />
                  </div>
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
                      <div className="grid gap-3 sm:grid-cols-3">
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

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
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
                            <input type="number" value={donationDraft.amount} onChange={(event) => setDonationDraft((current) => ({ ...current, amount: Number(event.target.value) }))} placeholder="Amount" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
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
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Pending donations</p>
                              <p className="text-sm text-slate-500">Active donations that are still waiting to be completed.</p>
                            </div>
                            <div className="text-right">
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
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Completed donations</p>
                              <p className="text-sm text-slate-500">Finished donations with their initiated and completed dates.</p>
                            </div>
                            <div className="text-right">
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
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {quickExpenseOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setQuickExpenseOpen(false)}>
          <div className="mx-auto mt-20 max-w-lg rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/90" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">New transaction</h3>
              <button onClick={() => setQuickExpenseOpen(false)} className="text-sm text-slate-500">Close</button>
            </div>
            <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); addTransaction.mutate(transactionDraft); }}>
              <input value={transactionDraft.title} onChange={(event) => setTransactionDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <input type="number" value={transactionDraft.amount} onChange={(event) => setTransactionDraft((current) => ({ ...current, amount: event.target.value === "" ? "" : Number(event.target.value) }))} placeholder="Amount in BDT" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <input value={transactionDraft.category} onChange={(event) => setTransactionDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <input value={transactionDraft.section} onChange={(event) => setTransactionDraft((current) => ({ ...current, section: event.target.value.toLowerCase() || "family" }))} placeholder="Section like self or family" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <select value={transactionDraft.kind} onChange={(event) => setTransactionDraft((current) => ({ ...current, kind: event.target.value as TransactionKind }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="donation">Donation</option>
              </select>
              <input type="datetime-local" value={transactionDraft.occurredAt.slice(0, 16)} onChange={(event) => setTransactionDraft((current) => ({ ...current, occurredAt: new Date(event.target.value).toISOString() }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-white dark:bg-cyan-400 dark:text-slate-950">Save transaction</button>
            </form>
          </div>
        </div>
      ) : null}

      {pdfExportOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setPdfExportOpen(false)}>
          <div className="mx-auto mt-24 max-w-md rounded-[32px] border border-white/30 bg-white/90 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/95" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-600">Export PDF</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">Download transaction report</h3>
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
                <label className="mb-2 block text-sm text-slate-500">Section</label>
                <select value={pdfExportDraft.section} onChange={(event) => setPdfExportDraft((current) => ({ ...current, section: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80">
                  <option value="all">All sections</option>
                  {availableSections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setPdfExportOpen(false)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
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
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-cyan-400 dark:text-slate-950"
              >
                {exportTransactionsPdf.isPending ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {donationToRemove ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setDonationToRemove(null)}>
          <div className="mx-auto mt-24 max-w-md rounded-[32px] border border-white/30 bg-white/90 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/95" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm uppercase tracking-[0.24em] text-rose-500">Confirm removal</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">Remove this donation?</h3>
            <p className="mt-3 text-sm text-slate-500">
              <span className="font-medium text-slate-900 dark:text-white">{donationToRemove.title}</span>
              {" "}for {formatCurrency(donationToRemove.amount)} will be deleted from your donation tracker.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setDonationToRemove(null)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                Cancel
              </button>
              <button type="button" onClick={() => deleteDonation.mutate(donationToRemove._id)} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white">
                {deleteDonation.isPending ? "Removing..." : "Remove donation"}
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
  const [autoLogin, setAutoLogin] = useState(true);

  return (
    <LoginGate ready={ready} autoLogin={autoLogin} onAuthenticated={() => { setReady(true); setAutoLogin(false); }}>
      <AppShell onLogout={() => { setReady(false); setAutoLogin(false); }} />
    </LoginGate>
  );
}

export default function App() {
  return <QueryClientProvider client={queryClient}><RoutedApp /></QueryClientProvider>;
}
