'use client';

import { Clock, CheckCircle, TrendingUp, Banknote } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface WalletData {
    pendingBalance:   number;
    availableBalance: number;
    totalEarned:      number;
    totalPaidOut:     number;
}

interface WalletCardProps {
    wallet:      WalletData;
    nextUnlock:  string | null; // ISO date string or null
    justUnlocked: number;       // # of commissions that just became available
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function formatEGP(amount: number): string {
    return new Intl.NumberFormat('ar-EG', {
        style:    'currency',
        currency: 'EGP',
        maximumFractionDigits: 0,
    }).format(amount);
}

function daysUntil(dateStr: string): number {
    const now    = new Date();
    const target = new Date(dateStr);
    return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function WalletCard({ wallet, nextUnlock, justUnlocked }: WalletCardProps) {
    const cards = [
        {
            id:          'pending',
            label:       'Pending Balance',
            sublabel:    nextUnlock
                ? `Unlocks in ${daysUntil(nextUnlock)} day${daysUntil(nextUnlock) === 1 ? '' : 's'}`
                : wallet.pendingBalance > 0 ? 'Unlocking soon' : 'No locked commissions',
            value:       wallet.pendingBalance,
            icon:        Clock,
            iconBg:      'bg-amber-100',
            iconColor:   'text-amber-600',
            valueBg:     'bg-amber-50',
            borderColor: 'border-amber-200',
            valueColor:  'text-amber-800',
        },
        {
            id:          'available',
            label:       'Available Balance',
            sublabel:    wallet.availableBalance > 0 ? 'Ready to withdraw' : 'Nothing to withdraw yet',
            value:       wallet.availableBalance,
            icon:        CheckCircle,
            iconBg:      'bg-emerald-100',
            iconColor:   'text-emerald-600',
            valueBg:     'bg-emerald-50',
            borderColor: 'border-emerald-200',
            valueColor:  'text-emerald-800',
        },
        {
            id:          'total',
            label:       'Total Earned',
            sublabel:    'Lifetime commissions',
            value:       wallet.totalEarned,
            icon:        TrendingUp,
            iconBg:      'bg-blue-100',
            iconColor:   'text-blue-600',
            valueBg:     'bg-blue-50',
            borderColor: 'border-blue-200',
            valueColor:  'text-blue-800',
        },
        {
            id:          'paid',
            label:       'Total Paid Out',
            sublabel:    'Lifetime withdrawals',
            value:       wallet.totalPaidOut,
            icon:        Banknote,
            iconBg:      'bg-purple-100',
            iconColor:   'text-purple-600',
            valueBg:     'bg-purple-50',
            borderColor: 'border-purple-200',
            valueColor:  'text-purple-800',
        },
    ];

    return (
        <section aria-labelledby="wallet-heading">
            <h2 id="wallet-heading" className="text-xl font-semibold text-gray-900 mb-4">
                My Wallet
            </h2>

            {/* "Just unlocked" banner — shown when lazy unlock released commissions */}
            {justUnlocked > 0 && (
                <div
                    className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"
                    role="status"
                    aria-live="polite"
                >
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-emerald-800">
                        🎉 {justUnlocked} commission{justUnlocked > 1 ? 's have' : ' has'} just been unlocked and moved to your Available Balance!
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.id}
                            className={`bg-white rounded-2xl border ${card.borderColor} shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200`}
                        >
                            {/* Icon + Label */}
                            <div className="flex items-center gap-3">
                                <div className={`${card.iconBg} rounded-xl p-2.5 flex-shrink-0`} aria-hidden="true">
                                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-700">{card.label}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{card.sublabel}</p>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className={`${card.valueBg} rounded-xl px-4 py-3`}>
                                <p className={`text-2xl font-bold tracking-tight ${card.valueColor}`}>
                                    {formatEGP(card.value)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
