'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession }   from 'next-auth/react';
import { redirect }     from 'next/navigation';
import Link             from 'next/link';
import {
    BookOpen, Clock, CheckCircle, BadgeCheck, Copy, Check,
    ExternalLink, TrendingUp,
} from 'lucide-react';
import WalletCard,        { type WalletData }     from '@/components/volunteer/WalletCard';
import PayoutRequestForm                           from '@/components/volunteer/PayoutRequestForm';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Commission {
    _id:              string;
    courseId:         string;
    orderId:          string;
    saleAmount:       number;
    commissionAmount: number;
    status:           'pending' | 'available' | 'paid';
    unlocksAt:        string;
    createdAt:        string;
    payoutId?:        string;
    course?:          { title: string; thumbnail?: string };
}

interface DashboardData {
    commissions:  Commission[];
    wallet:       WalletData;
    summary: {
        totalSales:   number;
        pendingCount: number;
        nextUnlock:   string | null;
        justUnlocked: number;
    };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatEGP(n: number) {
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency', currency: 'EGP', maximumFractionDigits: 0,
    }).format(n);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-EG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
    return Math.max(0, Math.ceil(
        (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ));
}

const STATUS_CONFIG = {
    pending:   { label: 'Locked',    icon: Clock,        cls: 'text-amber-700  bg-amber-50  border-amber-200'  },
    available: { label: 'Available', icon: CheckCircle,  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    paid:      { label: 'Paid Out',  icon: BadgeCheck,   cls: 'text-purple-700 bg-purple-50 border-purple-200' },
} as const;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function VolunteerAffiliatePage() {
    const { data: session, status } = useSession();

    const [data,          setData]          = useState<DashboardData | null>(null);
    const [affiliateCode, setAffiliateCode] = useState<string>('');
    const [isLoading,     setIsLoading]     = useState(true);
    const [error,         setError]         = useState<string | null>(null);
    const [codeCopied,    setCodeCopied]    = useState(false);
    const [linkCopied,    setLinkCopied]    = useState(false);
    const [hasPendingPayout, setHasPendingPayout] = useState(false);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [codeRes, commissionsRes] = await Promise.all([
                fetch('/api/volunteer/affiliate-code'),
                fetch('/api/volunteer/commissions'),
            ]);

            const codeData        = await codeRes.json();
            const commissionsData = await commissionsRes.json();

            if (codeData.success)        setAffiliateCode(codeData.data.affiliateCode);
            if (commissionsData.success) setData(commissionsData.data);

        } catch {
            setError('Failed to load dashboard. Please refresh the page.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user?.role === 'volunteer') {
            fetchAll();
        }
    }, [session, fetchAll]);

    // ── Auth guards ───────────────────────────────────────────────────────────
    if (status === 'loading' || isLoading) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" aria-hidden="true" />
                    <p className="mt-4 text-gray-600">Loading your dashboard…</p>
                </div>
            </main>
        );
    }

    if (status === 'unauthenticated' || session?.user?.role !== 'volunteer') {
        redirect('/dashboard');
    }

    // ── Copy helpers ──────────────────────────────────────────────────────────
    const baseUrl     = typeof window !== 'undefined' ? window.location.origin : 'https://innoaccess.vercel.app';
    const affiliateUrl = `${baseUrl}/courses?ref=${affiliateCode}`;

    async function copyText(text: string, setter: (v: boolean) => void) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
            document.body.appendChild(ta); ta.focus(); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta);
        }
        setter(true);
        setTimeout(() => setter(false), 2000);
    }

    const wallet  = data?.wallet  ?? { pendingBalance: 0, availableBalance: 0, totalEarned: 0, totalPaidOut: 0 };
    const summary = data?.summary ?? { totalSales: 0, pendingCount: 0, nextUnlock: null, justUnlocked: 0 };
    const commissions = data?.commissions ?? [];

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">

                {/* ── Page Header ─────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Affiliate Dashboard</h1>
                        <p className="mt-1 text-gray-600">Track your commissions and manage withdrawals</p>
                    </div>
                    <Link
                        href="/volunteer/courses"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        Browse Courses to Share
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm" role="alert">
                        {error}
                    </div>
                )}

                {/* ── Affiliate Code Card ──────────────────────────────────── */}
                {affiliateCode && (
                    <section
                        aria-labelledby="code-section-heading"
                        className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg"
                    >
                        <h2 id="code-section-heading" className="text-sm font-medium text-blue-200 mb-4">
                            Your Unique Affiliate Identity
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Code */}
                            <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs text-blue-200 mb-0.5">Affiliate Code</p>
                                    <p className="text-xl font-bold tracking-widest">{affiliateCode}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyText(affiliateCode, setCodeCopied)}
                                    aria-label={codeCopied ? 'Code copied!' : 'Copy affiliate code'}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                >
                                    {codeCopied
                                        ? <><Check className="h-4 w-4" aria-hidden="true" /> Copied!</>
                                        : <><Copy className="h-4 w-4" aria-hidden="true" /> Copy Code</>}
                                </button>
                            </div>

                            {/* Link */}
                            <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs text-blue-200 mb-0.5">Affiliate Link</p>
                                    <p className="text-sm font-mono text-blue-100 truncate">{affiliateUrl}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => copyText(affiliateUrl, setLinkCopied)}
                                        aria-label={linkCopied ? 'Link copied!' : 'Copy affiliate link'}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                    >
                                        {linkCopied
                                            ? <><Check className="h-4 w-4" aria-hidden="true" /> Copied!</>
                                            : <><Copy className="h-4 w-4" aria-hidden="true" /> Copy Link</>}
                                    </button>
                                    <a
                                        href={affiliateUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Open affiliate link in new tab"
                                        className="flex items-center justify-center w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                    >
                                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── Summary Stats ────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Total Sales',   value: summary.totalSales,   icon: TrendingUp,  color: 'text-blue-600'  },
                        { label: 'Locked Sales',  value: summary.pendingCount, icon: Clock,       color: 'text-amber-600' },
                        { label: 'Total Courses', value: commissions.length > 0
                            ? new Set(commissions.map((c) => c.courseId)).size
                            : 0,                                                icon: BookOpen,    color: 'text-purple-600' },
                    ].map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                                <div className="bg-gray-100 rounded-xl p-2.5" aria-hidden="true">
                                    <Icon className={`h-5 w-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Wallet Balances ──────────────────────────────────────── */}
                <WalletCard
                    wallet={wallet}
                    nextUnlock={summary.nextUnlock}
                    justUnlocked={summary.justUnlocked}
                />

                {/* ── Two-column: Commissions Table + Payout Form ─────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Commission History (2/3 width) */}
                    <section
                        className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                        aria-labelledby="commissions-heading"
                    >
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 id="commissions-heading" className="text-base font-semibold text-gray-900">
                                Commission History
                            </h2>
                            <span className="text-xs text-gray-500">{commissions.length} entries</span>
                        </div>

                        {commissions.length === 0 ? (
                            <div className="text-center py-16 px-6">
                                <TrendingUp className="h-14 w-14 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                                <p className="font-semibold text-gray-600 mb-1">No commissions yet</p>
                                <p className="text-sm text-gray-500">
                                    Share your affiliate link from the{' '}
                                    <Link href="/volunteer/courses" className="text-blue-600 hover:underline">
                                        Courses page
                                    </Link>{' '}
                                    to start earning.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Sale</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {commissions.map((commission) => {
                                            const cfg = STATUS_CONFIG[commission.status];
                                            const Icon = cfg.icon;
                                            return (
                                                <tr key={commission._id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-gray-900 line-clamp-1 max-w-[180px]">
                                                            {commission.course?.title ?? 'Unknown Course'}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                        {formatDate(commission.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                                                        {formatEGP(commission.saleAmount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                                                        +{formatEGP(commission.commissionAmount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                                                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                                            {cfg.label}
                                                            {commission.status === 'pending' && (
                                                                <span className="text-amber-600 font-normal">
                                                                    {' '}·{' '}{daysUntil(commission.unlocksAt)}d
                                                                </span>
                                                            )}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Payout Request (1/3 width) */}
                    <section
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
                        aria-labelledby="payout-section-heading"
                    >
                        <h2 id="payout-section-heading" className="sr-only">Withdrawal Request</h2>
                        <PayoutRequestForm
                            availableBalance={wallet.availableBalance}
                            hasPendingPayout={hasPendingPayout}
                            onSuccess={() => {
                                setHasPendingPayout(true);
                                fetchAll(); // Refresh wallet after payout request
                            }}
                        />
                    </section>
                </div>
            </div>
        </main>
    );
}
