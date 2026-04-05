import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownCircle, ArrowUpCircle, Bolt, CheckCircle2, Clock3, HeartHandshake, Landmark, Moon, Search, SunMedium, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Toaster, toast } from "sonner";

import { CommandPalette } from "./components/command-palette";
import { TransactionTable } from "./components/transaction-table";
import { api } from "./lib/api";
import { formatCalendarDate, formatCurrency, formatRecentDate } from "./lib/format";
import { cn } from "./lib/utils";
import type { DashboardSummary, Transaction, TransactionKind } from "./types";

const queryClient = new QueryClient();
type DonationDraft = { title: string; amount: number; status: "pending" | "completed"; initiatedAt: string; completedAt: string | null };

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

function LoginGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [credentials, setCredentials] = useState({ email: "demo@fintrack.app", password: "demo1234" });
  const login = useMutation({
    mutationFn: () => api.login(credentials.email, credentials.password),
    onSuccess: () => {
      setReady(true);
      toast.success("Signed in with secure HttpOnly cookie session.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const { mutate: triggerLogin, isPending } = login;

  useEffect(() => {
    triggerLogin();
  }, [triggerLogin]);

  if (ready) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_35%),linear-gradient(135deg,#f8fafc,#dbeafe_45%,#f8fafc)] px-4 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.15),_transparent_35%),linear-gradient(135deg,#020617,#0f172a_45%,#020617)]">
      <form onSubmit={(event) => { event.preventDefault(); login.mutate(); }} className="w-full max-w-md rounded-[32px] border border-white/40 bg-white/70 p-8 shadow-2xl shadow-cyan-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/75">
        <p className="text-sm uppercase tracking-[0.32em] text-cyan-600">FinTrack</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Modern finance command center</h1>
        <p className="mt-2 text-sm text-slate-500">Demo credentials are prefilled so you can jump straight into the dashboard.</p>
        <div className="mt-6 space-y-4">
          <input value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none dark:border-slate-700 dark:bg-slate-950/80" />
          <input type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 outline-none dark:border-slate-700 dark:bg-slate-950/80" />
        </div>
        <button className="mt-6 w-full rounded-2xl bg-slate-950 px-4 py-3 text-white dark:bg-cyan-400 dark:text-slate-950">{isPending ? "Starting workspace..." : "Enter Dashboard"}</button>
      </form>
    </div>
  );
}

function DashboardView({ summary, openQuickExpense }: { summary?: DashboardSummary; openQuickExpense: () => void }) {
  const chartData = useMemo(() => {
    const base = new Map<string, { month: string; income: number; expense: number; donation: number }>();
    summary?.chart.forEach((item) => {
      const current = base.get(item._id.month) ?? { month: item._id.month, income: 0, expense: 0, donation: 0 };
      current[item._id.kind] = item.total;
      base.set(item._id.month, current);
    });
    return [...base.values()];
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Income", value: summary?.totals?.totalIncome ?? 0, icon: Landmark },
          { label: "Expenses", value: summary?.totals?.totalExpense ?? 0, icon: Wallet },
          { label: "Donations", value: summary?.totals?.totalDonation ?? 0, icon: HeartHandshake },
          { label: "Savings", value: summary?.totals?.totalSavings ?? 0, icon: Bolt },
        ].map((item) => (
          <motion.div key={item.label} layout>
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(item.value)}</p>
                </div>
                <item.icon className="h-5 w-5 text-cyan-500" />
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Aggregation-powered cashflow</p>
              <p className="text-sm text-slate-500">Charts are computed server-side with MongoDB pipelines.</p>
            </div>
            <button type="button" onClick={openQuickExpense} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-white">Add expense</button>
          </div>
          <div className="h-72">
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
          <GlassCard>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Financial health</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className={cn("h-full rounded-full transition-all", (summary?.healthScore ?? 0) >= 70 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${summary?.healthScore ?? 0}%` }} />
            </div>
            <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">{summary?.healthScore ?? 0}/100</p>
            <p className="mt-2 text-sm text-slate-500">Savings-to-expense ratio plus budget discipline rolled into a single score.</p>
          </GlassCard>

          <GlassCard>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Monthly budgets</p>
            <div className="mt-4 space-y-4">
              {summary?.budgets?.map((budget) => {
                const progress = Math.min(100, Math.round(((budget.spent ?? 0) / budget.limit) * 100));
                return (
                  <div key={`${budget.category}-${budget.month}`}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-200">{budget.category}</span>
                      <span className="text-slate-500">{formatCurrency(budget.spent ?? 0)} / {formatCurrency(budget.limit)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className={cn("h-full rounded-full", progress >= 80 ? "bg-rose-500" : "bg-cyan-500")} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      <GlassCard>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Recent activity</p>
        <div className="mt-4 space-y-3">
          {summary?.recentTransactions.map((item) => (
            <motion.div layout key={item._id} className="flex items-center justify-between rounded-2xl bg-slate-50/90 px-4 py-3 dark:bg-slate-950/70">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-slate-500">{item.category} | {formatRecentDate(item.occurredAt)}</p>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</p>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function AppShell() {
  const queryClientLocal = useQueryClient();
  const { theme, toggle } = useThemeMode();
  const location = useLocation();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [filters, setFilters] = useState({ q: "", kind: "all", month: currentMonth, section: "all" });
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);
  const [transactionDraft, setTransactionDraft] = useState<Omit<Transaction, "_id">>({ title: "", amount: 0, category: "Food", section: "self", kind: "expense", occurredAt: new Date().toISOString() });
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
    mutationFn: api.addTransaction,
    onSuccess: () => {
      setQuickExpenseOpen(false);
      setTransactionDraft({ title: "", amount: 0, category: "Food", section: "self", kind: "expense", occurredAt: new Date().toISOString() });
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
  const bulkDelete = useMutation({ mutationFn: api.deleteTransactions, onSuccess: () => { toast.success("Selected rows deleted."); invalidate(); } });

  const donationItems = donations.data?.donations ?? [];
  const pendingDonations = donationItems.filter((item) => item.status === "pending");
  const completedDonations = donationItems.filter((item) => item.status === "completed");
  const trackedDonationAmount = donationItems.reduce((sum, item) => sum + item.amount, 0);
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
            <button type="button" onClick={toggle} className="rounded-full border border-white/30 p-2 dark:border-white/10" aria-label="Toggle theme">
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
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
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-600">April 2026</p>
            <h2 className="mt-2 text-3xl font-semibold">Money, mission, and momentum</h2>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
              <Routes location={location}>
                <Route path="/" element={<DashboardView summary={summary.data} openQuickExpense={() => setQuickExpenseOpen(true)} />} />
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

                    <TransactionTable rows={transactions.data ?? []} loading={transactions.isLoading} onDeleteSelected={(ids) => ids.length && bulkDelete.mutate(ids)} />
                  </div>
                } />
                <Route path="/donations" element={
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        { label: "Tracked donations", value: donationItems.length, icon: HeartHandshake, tone: "text-cyan-500" },
                        { label: "Pending", value: pendingDonations.length, icon: Clock3, tone: "text-amber-500" },
                        { label: "Completed", value: completedDonations.length, icon: CheckCircle2, tone: "text-emerald-500" },
                      ].map((item) => (
                        <GlassCard key={item.label}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">{item.label}</p>
                              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
                            </div>
                            <item.icon className={cn("h-5 w-5", item.tone)} />
                          </div>
                        </GlassCard>
                      ))}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                      <GlassCard className="h-fit">
                        <form onSubmit={(event) => {
                          event.preventDefault();
                          addDonation.mutate({
                            ...donationDraft,
                            completedAt: donationDraft.status === "completed" ? donationDraft.completedAt ?? donationDraft.initiatedAt : null,
                          });
                        }}>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Track donation</p>
                          <p className="mt-1 text-sm text-slate-500">Create a donation entry and keep it pending until the payment is completed.</p>
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
                          <div className="mt-4 rounded-2xl bg-slate-100/80 p-4 text-sm text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">
                            Total tracked amount: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(trackedDonationAmount)}</span>
                          </div>
                          <button className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-white dark:bg-cyan-400 dark:text-slate-950">
                            {addDonation.isPending ? "Saving donation..." : "Save donation"}
                          </button>
                        </form>
                      </GlassCard>

                      <div className="space-y-6">
                        <GlassCard>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Pending donations</p>
                              <p className="text-sm text-slate-500">These donations have been initiated but not completed yet.</p>
                            </div>
                            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-300">{pendingDonations.length}</span>
                          </div>
                          <div className="mt-4 space-y-3">
                            {pendingDonations.length ? pendingDonations.map((plan) => (
                              <div key={plan._id} className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">{plan.title}</p>
                                    <p className="mt-1 text-sm text-slate-500">Initiated: {formatCalendarDate(plan.initiatedAt)}</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(plan.amount)}</p>
                                  </div>
                                  <button type="button" onClick={() => updateDonationStatus.mutate({ id: plan._id, status: "completed" })} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white">
                                    Mark completed
                                  </button>
                                </div>
                              </div>
                            )) : (
                              <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">No pending donations right now.</div>
                            )}
                          </div>
                        </GlassCard>

                        <GlassCard>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Completed donations</p>
                              <p className="text-sm text-slate-500">Each entry shows when the donation started and when it was completed.</p>
                            </div>
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">{completedDonations.length}</span>
                          </div>
                          <div className="mt-4 space-y-3">
                            {completedDonations.length ? completedDonations.map((plan) => (
                              <div key={plan._id} className="rounded-3xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">{plan.title}</p>
                                    <p className="mt-1 text-sm text-slate-500">Initiated: {formatCalendarDate(plan.initiatedAt)}</p>
                                    <p className="text-sm text-slate-500">Completed: {plan.completedAt ? formatCalendarDate(plan.completedAt) : "Not set"}</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(plan.amount)}</p>
                                  </div>
                                  <button type="button" onClick={() => updateDonationStatus.mutate({ id: plan._id, status: "pending" })} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                                    Move to pending
                                  </button>
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
        <div className="fixed inset-0 z-40 bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-20 max-w-lg rounded-[32px] border border-white/30 bg-white/80 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/90">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">New transaction</h3>
              <button onClick={() => setQuickExpenseOpen(false)} className="text-sm text-slate-500">Close</button>
            </div>
            <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); addTransaction.mutate(transactionDraft); }}>
              <input value={transactionDraft.title} onChange={(event) => setTransactionDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <input type="number" value={transactionDraft.amount} onChange={(event) => setTransactionDraft((current) => ({ ...current, amount: Number(event.target.value) }))} placeholder="Amount in BDT" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <input value={transactionDraft.category} onChange={(event) => setTransactionDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
              <input value={transactionDraft.section} onChange={(event) => setTransactionDraft((current) => ({ ...current, section: event.target.value.toLowerCase() || "self" }))} placeholder="Section like self or family" className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/80" />
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
    </div>
  );
}

function RoutedApp() {
  return <LoginGate><AppShell /></LoginGate>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><RoutedApp /></QueryClientProvider>;
}
