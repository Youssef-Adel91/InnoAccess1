'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession }   from 'next-auth/react';
import { redirect }     from 'next/navigation';
import {
    Clock, CheckCircle, BadgeCheck, TrendingUp
} from 'lucide-react';
import WalletCard, { type WalletData } from '@/components/volunteer/WalletCard';
import PayoutRequestForm from '@/components/volunteer/PayoutRequestForm';
import { useTranslations } from 'next-intl';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TrainerCommission {
    _id:              string;
    courseId:         string;
    orderId:          string;
    amount:           number;
    status:           'PENDING' | 'AVAILABLE' | 'PAID';
    unlocksAt:        string;
    createdAt:        string;
    course?:          { title: string };
}

interface DashboardData {
    commissions:  TrainerCommission[];
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
    PENDING:   { label: 'Locked',    icon: Clock,        cls: 'text-amber-700  bg-amber-50  border-amber-200'  },
    AVAILABLE: { label: 'Available', icon: CheckCircle,  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    PAID:      { label: 'Paid Out',  icon: BadgeCheck,   cls: 'text-purple-700 bg-purple-50 border-purple-200' },
} as const;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TrainerFinancePage() {
    const { data: session, status } = useSession();
    const t = useTranslations('TrainerFinance');

    const [data,          setData]          = useState<DashboardData | null>(null);
    const [isLoading,     setIsLoading]     = useState(true);
    const [error,         setError]         = useState<string | null>(null);
    const [hasPendingPayout, setHasPendingPayout] = useState(false);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/trainer/finance');
            const resData = await res.json();

            if (resData.success) setData(resData.data);
            else setError(resData.error?.message || 'Failed to load dashboard.');
        } catch {
            setError('Failed to load dashboard. Please refresh the page.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user?.role === 'trainer') {
            fetchAll();
        }
    }, [session, fetchAll]);

    // ── Auth guards ───────────────────────────────────────────────────────────
    if (status === 'loading' || isLoading) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" aria-hidden="true" />
                    <p className="mt-4 text-gray-600">{t('loading') || 'Loading your dashboard…'}</p>
                </div>
            </main>
        );
    }

    if (status === 'unauthenticated' || session?.user?.role !== 'trainer') {
        redirect('/dashboard');
    }

    const wallet  = data?.wallet  ?? { pendingBalance: 0, availableBalance: 0, totalEarned: 0, totalPaidOut: 0 };
    const summary = data?.summary ?? {
        totalSales: 0, pendingCount: 0, nextUnlock: null, justUnlocked: 0,
    };
    const commissions  = data?.commissions ?? [];

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">

                {/* ── Page Header ─────────────────────────────────────────── */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('pageTitle') || 'Financial Dashboard'}</h1>
                    <p className="mt-1 text-gray-600">{t('pageSubtitle') || 'Track your course sales and manage withdrawals'}</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm" role="alert">
                        {error}
                    </div>
                )}

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
                                {t('commissionHistory') || 'Commission History'}
                            </h2>
                            <span className="text-xs text-gray-500">{commissions.length} {t('entries') || 'entries'}</span>
                        </div>

                        {commissions.length === 0 ? (
                            <div className="text-center py-16 px-6">
                                <TrendingUp className="h-14 w-14 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                                <p className="font-semibold text-gray-600 mb-1">{t('noCommissions') || 'No commissions yet'}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('course') || 'Course'}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('date') || 'Date'}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('commission') || 'Commission'}</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('status') || 'Status'}</th>
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
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                                                        +{formatEGP(commission.amount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
                                                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                                            {t(cfg.label) || cfg.label}
                                                            {commission.status === 'PENDING' && commission.unlocksAt && (
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
                            apiEndpoint="/api/trainer/payout"
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
