'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useSession }      from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { redirect }        from 'next/navigation';
import {
    TrendingUp, Banknote, ReceiptText, DollarSign,
    ChevronDown, CheckCircle2, AlertTriangle, Loader2,
    ListFilter, PlusCircle, RefreshCw, ShieldCheck,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceSummary {
    totalGrossRevenue:   number;
    totalPlatformProfit: number;
    totalPendingPayouts: number;
    trainerPending:      number;
    volunteerPending:    number;
    totalExpenses:       number;
    netProfit:           number;
    revenueByMonth:      { month: string; gross: number; profit: number }[];
}

interface WalletRow {
    _id:              string;
    userType:         'trainer' | 'volunteer';
    availableBalance: number;
    totalEarned:      number;
    totalPaidOut:     number;
    user: { name: string; email: string; role: string };
}

interface ExpenseRow {
    _id:         string;
    amount:      number;
    category:    string;
    description: string;
    date:        string;
    addedBy:     { name: string; email: string };
}

interface LedgerRow {
    _id:         string;
    entryType:   string;
    amount:      number;
    note:        string;
    createdAt:   string;
    user?:       { name: string; email: string; role: string };
    courseTitle?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEGP(n: number) {
    return new Intl.NumberFormat('en-EG', {
        style: 'currency', currency: 'EGP', maximumFractionDigits: 0,
    }).format(n);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-EG', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
    GROSS_REVENUE:        'Gross Revenue',
    GATEWAY_FEE:          'Gateway Fee',
    TRAINER_COMMISSION:   'Trainer Commission',
    VOLUNTEER_COMMISSION: 'Volunteer Commission',
    NET_PLATFORM_PROFIT:  'Platform Profit',
    PAYOUT_SETTLED:       'Payout Settled',
    MANUAL_EXPENSE:       'Manual Expense',
};

const ENTRY_TYPE_COLORS: Record<string, string> = {
    GROSS_REVENUE:        'bg-emerald-100 text-emerald-800',
    GATEWAY_FEE:          'bg-red-100 text-red-700',
    TRAINER_COMMISSION:   'bg-purple-100 text-purple-800',
    VOLUNTEER_COMMISSION: 'bg-blue-100 text-blue-800',
    NET_PLATFORM_PROFIT:  'bg-teal-100 text-teal-800',
    PAYOUT_SETTLED:       'bg-orange-100 text-orange-800',
    MANUAL_EXPENSE:       'bg-gray-100 text-gray-700',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
    label, value, icon: Icon, color, bg, sub,
}: {
    label: string; value: number; icon: React.ElementType;
    color: string; bg: string; sub?: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
                <div className={`${bg} rounded-xl p-3`} aria-hidden="true">
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{formatEGP(value)}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

function SparklineChart({ data }: { data: { month: string; gross: number; profit: number }[] }) {
    if (data.length < 2) return <p className="text-xs text-gray-400 py-4 text-center">No data yet</p>;

    const W = 600; const H = 100; const pad = 8;
    const maxVal = Math.max(...data.map(d => d.gross), 1);

    const toPoints = (key: 'gross' | 'profit') =>
        data.map((d, i) => {
            const x = pad + (i / (data.length - 1)) * (W - 2 * pad);
            const y = H - pad - ((d[key] / maxVal) * (H - 2 * pad));
            return `${x},${y}`;
        }).join(' ');

    const firstX = pad; const lastX = pad + (W - 2 * pad);
    const areaPath = (pts: string) =>
        `M ${firstX},${H - pad} L ${pts.split(' ').join(' L ')} L ${lastX},${H - pad} Z`;

    const grossPts  = toPoints('gross');
    const profitPts = toPoints('profit');

    return (
        <div>
            <div className="flex gap-4 text-xs mb-2">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded bg-blue-500" />Gross Revenue</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded bg-emerald-500" />Platform Profit</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" role="img" aria-label="Revenue sparkline">
                <defs>
                    <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#3B82F6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#10B981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                <path d={areaPath(grossPts)}  fill="url(#sg1)" />
                <path d={areaPath(profitPts)} fill="url(#sg2)" />
                <polyline points={grossPts}  fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={profitPts} fill="none" stroke="#10B981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                <span>{data[0]?.month}</span>
                <span>{data[Math.floor(data.length / 2)]?.month}</span>
                <span>{data[data.length - 1]?.month}</span>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type ActiveTab = 'overview' | 'payouts' | 'expenses' | 'ledger';

const EXPENSE_CATEGORIES = ['SERVERS', 'MARKETING', 'SALARIES', 'TOOLS', 'OTHER'] as const;
const LEDGER_TYPES       = [
    'GROSS_REVENUE', 'GATEWAY_FEE', 'TRAINER_COMMISSION',
    'VOLUNTEER_COMMISSION', 'NET_PLATFORM_PROFIT', 'PAYOUT_SETTLED', 'MANUAL_EXPENSE',
] as const;

export default function AdminFinancePage() {
    const t = useTranslations('AdminFinance');
    const { data: session, status } = useSession();

    const [activeTab, setActiveTab]       = useState<ActiveTab>('overview');
    const [summary,   setSummary]         = useState<FinanceSummary | null>(null);
    const [wallets,   setWallets]         = useState<WalletRow[]>([]);
    const [expenses,  setExpenses]        = useState<ExpenseRow[]>([]);
    const [ledger,    setLedger]          = useState<LedgerRow[]>([]);
    const [loading,   setLoading]         = useState(true);
    const [tabLoading, setTabLoading]     = useState(false);
    const [toast,     setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [settlingId, setSettlingId]     = useState<string | null>(null);
    const [ledgerFilter, setLedgerFilter] = useState('');

    // Expense form state
    const [expForm, setExpForm] = useState({
        amount: '', category: 'SERVERS', description: '', date: '',
    });
    const [, startExpTransition] = useTransition();
    const [expSubmitting, setExpSubmitting] = useState(false);

    // ── Auth guard ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
            redirect('/dashboard');
        }
    }, [status, session]);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const fetchSummary = useCallback(async () => {
        const res  = await fetch('/api/admin/finance/summary');
        const json = await res.json();
        if (json.success) setSummary(json.data);
    }, []);

    const fetchWallets = useCallback(async () => {
        const res  = await fetch('/api/admin/finance/wallets');
        const json = await res.json();
        if (json.success) setWallets(json.data.wallets);
    }, []);

    const fetchExpenses = useCallback(async () => {
        const res  = await fetch('/api/admin/finance/expenses');
        const json = await res.json();
        if (json.success) setExpenses(json.data.expenses);
    }, []);

    const fetchLedger = useCallback(async (entryType = '') => {
        const url  = `/api/admin/finance/ledger${entryType ? `?entryType=${entryType}` : ''}`;
        const res  = await fetch(url);
        const json = await res.json();
        if (json.success) setLedger(json.data.entries);
    }, []);

    // Initial load
    useEffect(() => {
        if (status !== 'authenticated') return;
        (async () => {
            setLoading(true);
            await fetchSummary();
            setLoading(false);
        })();
    }, [status, fetchSummary]);

    // Tab-switch lazy loading
    useEffect(() => {
        if (status !== 'authenticated') return;
        setTabLoading(true);
        const load = async () => {
            if (activeTab === 'payouts')  await fetchWallets();
            if (activeTab === 'expenses') await fetchExpenses();
            if (activeTab === 'ledger')   await fetchLedger(ledgerFilter);
            setTabLoading(false);
        };
        load();
    }, [activeTab, status, fetchWallets, fetchExpenses, fetchLedger, ledgerFilter]);

    // ── Settle handler ────────────────────────────────────────────────────────
    const handleSettle = async (wallet: WalletRow) => {
        const confirmed = window.confirm(
            t('payouts.settleConfirm', { amount: wallet.availableBalance, name: wallet.user.name })
        );
        if (!confirmed) return;

        setSettlingId(wallet._id);
        try {
            const res  = await fetch(`/api/admin/finance/settle/${wallet._id}`, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                showToast('success', t('payouts.settleSuccess', { amount: wallet.availableBalance }));
                await Promise.all([fetchWallets(), fetchSummary()]);
            } else {
                showToast('error', json.error?.message ?? 'Settlement failed');
            }
        } catch {
            showToast('error', 'Network error');
        } finally {
            setSettlingId(null);
        }
    };

    // ── Expense submit ────────────────────────────────────────────────────────
    const handleExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setExpSubmitting(true);
        startExpTransition(async () => {
            try {
                const res  = await fetch('/api/admin/finance/expenses', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        amount:      parseFloat(expForm.amount),
                        category:    expForm.category,
                        description: expForm.description,
                        date:        expForm.date || undefined,
                    }),
                });
                const json = await res.json();
                if (json.success) {
                    showToast('success', t('expenses.successMsg'));
                    setExpForm({ amount: '', category: 'SERVERS', description: '', date: '' });
                    await Promise.all([fetchExpenses(), fetchSummary()]);
                } else {
                    showToast('error', json.error?.message ?? 'Failed to log expense');
                }
            } catch {
                showToast('error', 'Network error');
            } finally {
                setExpSubmitting(false);
            }
        });
    };

    // ── Loading state ──────────────────────────────────────────────────────────
    if (status === 'loading' || loading) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto" aria-hidden="true" />
                    <p className="mt-3 text-gray-500 text-sm">{t('loading')}</p>
                </div>
            </main>
        );
    }

    const tabs: { id: ActiveTab; label: string }[] = [
        { id: 'overview',  label: t('tabs.overview')  },
        { id: 'payouts',   label: t('tabs.payouts')   },
        { id: 'expenses',  label: t('tabs.expenses')  },
        { id: 'ledger',    label: t('tabs.ledger')    },
    ];

    return (
        <main id="main-content" className="min-h-screen bg-gray-50">
            {/* ── Toast ─────────────────────────────────────────────────────── */}
            {toast && (
                <div
                    role="alert"
                    aria-live="polite"
                    className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-xl text-sm font-medium transition-all duration-300 ${
                        toast.type === 'success'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                    }`}
                >
                    {toast.type === 'success'
                        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                        : <AlertTriangle className="h-4 w-4 shrink-0" />
                    }
                    {toast.msg}
                </div>
            )}

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* ── Header ────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6 text-blue-600" aria-hidden="true" />
                            {t('title')}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
                    </div>
                    <button
                        onClick={fetchSummary}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                        aria-label="Refresh data"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                    </button>
                </div>

                {/* ── Tab Bar ───────────────────────────────────────────────── */}
                <div
                    role="tablist"
                    aria-label="Finance sections"
                    className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm"
                >
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            role="tab"
                            id={`tab-${tab.id}`}
                            aria-selected={activeTab === tab.id}
                            aria-controls={`panel-${tab.id}`}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── OVERVIEW TAB ──────────────────────────────────────────── */}
                <div
                    role="tabpanel"
                    id="panel-overview"
                    aria-labelledby="tab-overview"
                    hidden={activeTab !== 'overview'}
                >
                    {summary && (
                        <div className="space-y-6">
                            {/* KPI Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <KpiCard
                                    label={t('kpi.grossRevenue')}
                                    value={summary.totalGrossRevenue}
                                    icon={TrendingUp}
                                    color="text-blue-600"
                                    bg="bg-blue-50"
                                    sub="All paid orders"
                                />
                                <KpiCard
                                    label={t('kpi.netProfit')}
                                    value={summary.netProfit}
                                    icon={DollarSign}
                                    color="text-emerald-600"
                                    bg="bg-emerald-50"
                                    sub="After commissions & expenses"
                                />
                                <KpiCard
                                    label={t('kpi.pendingPayouts')}
                                    value={summary.totalPendingPayouts}
                                    icon={Banknote}
                                    color="text-amber-600"
                                    bg="bg-amber-50"
                                    sub={`Trainers: ${formatEGP(summary.trainerPending)} · Volunteers: ${formatEGP(summary.volunteerPending)}`}
                                />
                                <KpiCard
                                    label={t('kpi.totalExpenses')}
                                    value={summary.totalExpenses}
                                    icon={ReceiptText}
                                    color="text-red-600"
                                    bg="bg-red-50"
                                    sub="Operating costs"
                                />
                            </div>

                            {/* Sparkline chart */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                                    Revenue vs. Profit — Last 12 Months
                                </h2>
                                <SparklineChart data={summary.revenueByMonth} />
                            </div>

                            {/* Split breakdown */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="text-sm font-semibold text-gray-700 mb-4">Revenue Allocation</h2>
                                {[
                                    { label: 'Gross Revenue',        value: summary.totalGrossRevenue,   color: 'bg-blue-500' },
                                    { label: 'Trainer Commissions',  value: summary.totalPendingPayouts, color: 'bg-purple-500' },
                                    { label: 'Operating Expenses',   value: summary.totalExpenses,       color: 'bg-red-400' },
                                    { label: 'Platform Net Profit',  value: summary.netProfit,           color: 'bg-emerald-500' },
                                ].map(({ label, value, color }) => {
                                    const pct = summary.totalGrossRevenue > 0
                                        ? Math.max(0, Math.round((value / summary.totalGrossRevenue) * 100))
                                        : 0;
                                    return (
                                        <div key={label} className="mb-3">
                                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span>{label}</span>
                                                <span className="font-semibold">{formatEGP(value)} ({pct}%)</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${color} rounded-full transition-all duration-500`}
                                                    style={{ width: `${pct}%` }}
                                                    role="progressbar"
                                                    aria-valuenow={pct}
                                                    aria-valuemin={0}
                                                    aria-valuemax={100}
                                                    aria-label={`${label}: ${pct}%`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── PAYOUTS TAB ───────────────────────────────────────────── */}
                <div
                    role="tabpanel"
                    id="panel-payouts"
                    aria-labelledby="tab-payouts"
                    hidden={activeTab !== 'payouts'}
                >
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-gray-900">{t('payouts.heading')}</h2>
                            <button
                                onClick={fetchWallets}
                                className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1"
                            >
                                <RefreshCw className="h-3 w-3" />Refresh
                            </button>
                        </div>

                        {tabLoading ? (
                            <div className="py-16 flex justify-center">
                                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                            </div>
                        ) : wallets.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
                                <p className="text-sm">{t('payouts.empty')}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {[
                                                t('payouts.colName'),
                                                t('payouts.colRole'),
                                                t('payouts.colAvailable'),
                                                t('payouts.colEarned'),
                                                t('payouts.colPaidOut'),
                                                t('payouts.colAction'),
                                            ].map(h => (
                                                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {wallets.map(w => (
                                            <tr key={w._id} className="hover:bg-gray-50/70 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <p className="font-medium text-gray-900">{w.user.name}</p>
                                                    <p className="text-xs text-gray-400">{w.user.email}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                                        w.userType === 'trainer'
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : 'bg-teal-100 text-teal-700'
                                                    }`}>
                                                        {w.userType}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 font-bold text-emerald-700 tabular-nums">
                                                    {formatEGP(w.availableBalance)}
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-600 tabular-nums">
                                                    {formatEGP(w.totalEarned)}
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-600 tabular-nums">
                                                    {formatEGP(w.totalPaidOut)}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <button
                                                        onClick={() => handleSettle(w)}
                                                        disabled={settlingId === w._id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                                        aria-label={`Settle ${w.user.name}'s balance of ${formatEGP(w.availableBalance)}`}
                                                    >
                                                        {settlingId === w._id ? (
                                                            <><Loader2 className="h-3 w-3 animate-spin" />{t('payouts.settling')}</>
                                                        ) : (
                                                            <><CheckCircle2 className="h-3 w-3" />{t('payouts.settleBtn')}</>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── EXPENSES TAB ──────────────────────────────────────────── */}
                <div
                    role="tabpanel"
                    id="panel-expenses"
                    aria-labelledby="tab-expenses"
                    hidden={activeTab !== 'expenses'}
                >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Add form */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-8">
                                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                                    <PlusCircle className="h-4 w-4 text-blue-600" />
                                    {t('expenses.addHeading')}
                                </h2>
                                <form onSubmit={handleExpenseSubmit} className="space-y-4" aria-label="Log new expense">
                                    <div>
                                        <label htmlFor="exp-amount" className="block text-xs font-medium text-gray-700 mb-1">
                                            {t('expenses.labelAmount')}
                                        </label>
                                        <input
                                            id="exp-amount"
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            required
                                            value={expForm.amount}
                                            onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="exp-cat" className="block text-xs font-medium text-gray-700 mb-1">
                                            {t('expenses.labelCategory')}
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="exp-cat"
                                                value={expForm.category}
                                                onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}
                                                className="w-full appearance-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            >
                                                {EXPENSE_CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat}>
                                                        {t(`expenses.categories.${cat}`)}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="exp-desc" className="block text-xs font-medium text-gray-700 mb-1">
                                            {t('expenses.labelDescription')}
                                        </label>
                                        <input
                                            id="exp-desc"
                                            type="text"
                                            required
                                            minLength={3}
                                            value={expForm.description}
                                            onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Vercel Pro — June 2025"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="exp-date" className="block text-xs font-medium text-gray-700 mb-1">
                                            {t('expenses.labelDate')}
                                        </label>
                                        <input
                                            id="exp-date"
                                            type="date"
                                            value={expForm.date}
                                            onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={expSubmitting}
                                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        {expSubmitting ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" />{t('expenses.submitting')}</>
                                        ) : (
                                            <><PlusCircle className="h-4 w-4" />{t('expenses.submitBtn')}</>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Expenses table */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <h2 className="text-base font-semibold text-gray-900">{t('expenses.heading')}</h2>
                                </div>

                                {tabLoading ? (
                                    <div className="py-12 flex justify-center">
                                        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                                    </div>
                                ) : expenses.length === 0 ? (
                                    <div className="py-12 text-center text-gray-400 text-sm">
                                        {t('expenses.empty')}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {[
                                                        t('expenses.colDate'),
                                                        t('expenses.colCategory'),
                                                        t('expenses.colDescription'),
                                                        t('expenses.colAmount'),
                                                        t('expenses.colAddedBy'),
                                                    ].map(h => (
                                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {expenses.map(exp => (
                                                    <tr key={exp._id} className="hover:bg-gray-50/70 transition-colors">
                                                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                                            {formatDate(exp.date)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                                {t(`expenses.categories.${exp.category as 'SERVERS' | 'MARKETING' | 'SALARIES' | 'TOOLS' | 'OTHER'}`)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 max-w-xs">
                                                            <span className="line-clamp-1">{exp.description}</span>
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold text-red-700 tabular-nums whitespace-nowrap">
                                                            {formatEGP(exp.amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                                            {exp.addedBy?.name ?? '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── LEDGER TAB ────────────────────────────────────────────── */}
                <div
                    role="tabpanel"
                    id="panel-ledger"
                    aria-labelledby="tab-ledger"
                    hidden={activeTab !== 'ledger'}
                >
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                            <h2 className="text-base font-semibold text-gray-900">{t('ledger.heading')}</h2>

                            {/* Entry type filter */}
                            <div className="relative flex items-center gap-2">
                                <ListFilter className="h-4 w-4 text-gray-400 absolute left-3 pointer-events-none" aria-hidden="true" />
                                <select
                                    value={ledgerFilter}
                                    onChange={e => setLedgerFilter(e.target.value)}
                                    aria-label="Filter by entry type"
                                    className="pl-8 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                                >
                                    <option value="">{t('ledger.filterAll')}</option>
                                    {LEDGER_TYPES.map(type => (
                                        <option key={type} value={type}>
                                            {t(`ledger.entryTypes.${type}`)}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                            </div>
                        </div>

                        {tabLoading ? (
                            <div className="py-16 flex justify-center">
                                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                            </div>
                        ) : ledger.length === 0 ? (
                            <div className="py-16 text-center text-gray-400 text-sm">
                                {t('ledger.empty')}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {[
                                                t('ledger.colDate'),
                                                t('ledger.colType'),
                                                t('ledger.colAmount'),
                                                t('ledger.colUser'),
                                                t('ledger.colCourse'),
                                                t('ledger.colNote'),
                                            ].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {ledger.map(entry => {
                                            const isIncome = ['GROSS_REVENUE', 'NET_PLATFORM_PROFIT'].includes(entry.entryType);
                                            return (
                                                <tr key={entry._id} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                                        {formatDate(entry.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ENTRY_TYPE_COLORS[entry.entryType] ?? 'bg-gray-100 text-gray-600'}`}>
                                                            {ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}
                                                        </span>
                                                    </td>
                                                    <td className={`px-4 py-3 font-semibold tabular-nums whitespace-nowrap ${isIncome ? 'text-emerald-700' : 'text-red-600'}`}>
                                                        {isIncome ? '+' : '−'}{formatEGP(entry.amount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                                        {entry.user?.name
                                                            ? <><p>{entry.user.name}</p><p className="text-gray-400 capitalize">{entry.user.role}</p></>
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px]">
                                                        <span className="line-clamp-1">{entry.courseTitle ?? '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px]">
                                                        <span className="line-clamp-2">{entry.note}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
