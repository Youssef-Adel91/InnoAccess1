'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession }  from 'next-auth/react';
import { redirect }    from 'next/navigation';
import Link            from 'next/link';
import {
    Banknote, Clock, CheckCircle, BadgeCheck, XCircle,
    ChevronLeft, Loader2, AlertCircle, User, Phone, X,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type PayoutStatus = 'pending' | 'approved' | 'paid' | 'rejected';

interface AdminPayout {
    _id:            string;
    amount:         number;
    method:         'vodafone_cash' | 'instapay';
    accountNumber:  string;
    status:         PayoutStatus;
    adminNote?:     string;
    processedAt?:   string;
    createdAt:      string;
    commissionCount: number;
    volunteer: {
        _id:           string;
        name:          string;
        email:         string;
        affiliateCode: string;
    };
    processedBy?: {
        name:  string;
        email: string;
    };
}

interface QueueData {
    payouts:    AdminPayout[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    counts:     Record<PayoutStatus | 'all', number>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PayoutStatus, {
    label:     string;
    icon:      React.ElementType;
    badgeCls:  string;
    rowCls:    string;
}> = {
    pending:  { label: 'Pending',  icon: Clock,       badgeCls: 'text-amber-700  bg-amber-50  border-amber-200',   rowCls: '' },
    approved: { label: 'Approved', icon: CheckCircle, badgeCls: 'text-blue-700   bg-blue-50   border-blue-200',    rowCls: 'bg-blue-50/30' },
    paid:     { label: 'Paid',     icon: BadgeCheck,  badgeCls: 'text-emerald-700 bg-emerald-50 border-emerald-200', rowCls: 'bg-emerald-50/30' },
    rejected: { label: 'Rejected', icon: XCircle,     badgeCls: 'text-red-700    bg-red-50    border-red-200',     rowCls: 'bg-red-50/30' },
};

const METHOD_LABEL: Record<string, string> = {
    vodafone_cash: '📱 Vodafone Cash',
    instapay:      '⚡ InstaPay',
};

const TABS: { key: PayoutStatus | 'all'; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'pending',  label: 'Pending'  },
    { key: 'approved', label: 'Approved' },
    { key: 'paid',     label: 'Paid'     },
    { key: 'rejected', label: 'Rejected' },
];

function formatEGP(n: number) {
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency', currency: 'EGP', maximumFractionDigits: 0,
    }).format(n);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-EG', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

// ─── Rejection Modal ───────────────────────────────────────────────────────────

function RejectModal({
    payout,
    onConfirm,
    onClose,
    isLoading,
}: {
    payout:    AdminPayout;
    onConfirm: (note: string) => void;
    onClose:   () => void;
    isLoading: boolean;
}) {
    const [note, setNote] = useState('');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-modal-title"
        >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 id="reject-modal-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                        Reject Payout Request
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        aria-label="Close"
                        className="text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-800">
                            <strong>Warning:</strong> Rejecting this payout will fully reverse the wallet deduction.
                            The volunteer will receive <strong>{formatEGP(payout.amount)}</strong> back to their
                            available balance and their {payout.commissionCount} commission(s) will be unlocked for a
                            future withdrawal.
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-600 mb-1">
                            Volunteer: <strong>{payout.volunteer?.name}</strong> ({payout.volunteer?.email})
                        </p>
                        <p className="text-sm text-gray-600">
                            Amount: <strong className="text-red-700">{formatEGP(payout.amount)}</strong> via{' '}
                            {METHOD_LABEL[payout.method] ?? payout.method}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="reject-note" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Rejection Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="reject-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={4}
                            required
                            placeholder="Explain why this payout is being rejected. The volunteer will see this note."
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none transition-colors"
                            maxLength={500}
                        />
                        <p className="mt-1 text-xs text-gray-500 text-right">{note.length}/500</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(note)}
                        disabled={isLoading || note.trim().length < 5}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-all"
                    >
                        {isLoading
                            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Rejecting…</>
                            : <><XCircle className="h-4 w-4" aria-hidden="true" /> Confirm Rejection</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPayoutsPage() {
    const { data: session, status } = useSession();

    const [data,         setData]         = useState<QueueData | null>(null);
    const [activeTab,    setActiveTab]    = useState<PayoutStatus | 'all'>('pending');
    const [isLoading,    setIsLoading]    = useState(true);
    const [actionId,     setActionId]     = useState<string | null>(null); // ID being acted on
    const [rejectTarget, setRejectTarget] = useState<AdminPayout | null>(null);
    const [toast,        setToast]        = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchPayouts = useCallback(async (tab: PayoutStatus | 'all') => {
        setIsLoading(true);
        try {
            const statusParam = tab !== 'all' ? `&status=${tab}` : '';
            const res  = await fetch(`/api/admin/payouts?limit=50${statusParam}`);
            const json = await res.json();
            if (json.success) setData(json.data);
        } catch {
            showToast('error', 'Failed to load payouts. Please refresh.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user?.role === 'admin') {
            fetchPayouts(activeTab);
        }
    }, [session, activeTab, fetchPayouts]);

    // ── Auth guards ───────────────────────────────────────────────────────────
    if (status === 'loading') {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" aria-hidden="true" />
            </main>
        );
    }

    if (status === 'unauthenticated' || session?.user?.role !== 'admin') {
        redirect('/dashboard');
    }

    // ── Toast helper ──────────────────────────────────────────────────────────
    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }

    // ── Action handler ────────────────────────────────────────────────────────
    async function handleAction(
        payoutId: string,
        action:   'approved' | 'paid' | 'rejected',
        note?:    string
    ) {
        setActionId(payoutId);
        try {
            const res = await fetch(`/api/admin/payouts/${payoutId}`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ action, adminNote: note }),
            });
            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error?.message || 'Action failed');
            }

            showToast('success', json.data.message);
            setRejectTarget(null);
            await fetchPayouts(activeTab);

        } catch (err: unknown) {
            showToast('error', err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setActionId(null);
        }
    }

    const payouts = data?.payouts ?? [];
    const counts  = data?.counts  ?? { all: 0, pending: 0, approved: 0, paid: 0, rejected: 0 };

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            {/* Toast notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium transition-all ${
                        toast.type === 'success'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 text-white'
                    }`}
                    role="status"
                    aria-live="polite"
                >
                    {toast.type === 'success'
                        ? <CheckCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        : <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    }
                    {toast.msg}
                </div>
            )}

            {/* Rejection Modal */}
            {rejectTarget && (
                <RejectModal
                    payout={rejectTarget}
                    isLoading={actionId === rejectTarget._id}
                    onClose={() => setRejectTarget(null)}
                    onConfirm={(note) => handleAction(rejectTarget._id, 'rejected', note)}
                />
            )}

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link
                                href="/admin"
                                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                Admin Dashboard
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Affiliate Payouts</h1>
                        <p className="mt-1 text-gray-600">
                            Review and process volunteer withdrawal requests
                        </p>
                    </div>
                    {/* Pending badge */}
                    {counts.pending > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                            <Clock className="h-5 w-5 text-amber-600" aria-hidden="true" />
                            <span className="text-sm font-semibold text-amber-800">
                                {counts.pending} pending request{counts.pending > 1 ? 's' : ''} need action
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Filter Tabs ──────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <nav
                        className="flex gap-1 p-1.5 overflow-x-auto"
                        role="tablist"
                        aria-label="Filter payouts by status"
                    >
                        {TABS.map((tab) => {
                            const count = counts[tab.key] ?? 0;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {tab.label}
                                    <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold ${
                                        isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* ── Content ──────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
                            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                            <span>Loading payouts…</span>
                        </div>
                    ) : payouts.length === 0 ? (
                        <div className="text-center py-20 px-6">
                            <Banknote className="h-14 w-14 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                            <p className="font-semibold text-gray-600">
                                No {activeTab !== 'all' ? activeTab : ''} payout requests
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {activeTab === 'pending'
                                    ? 'All caught up! No pending requests.'
                                    : 'Nothing to show for this filter.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Volunteer</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {payouts.map((payout) => {
                                        const cfg     = STATUS_CONFIG[payout.status];
                                        const Icon    = cfg.icon;
                                        const isActing = actionId === payout._id;

                                        return (
                                            <tr key={payout._id} className={`hover:bg-gray-50/80 transition-colors ${cfg.rowCls}`}>

                                                {/* Volunteer */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
                                                            <User className="h-5 w-5 text-blue-600" aria-hidden="true" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-gray-900 truncate">{payout.volunteer?.name ?? '—'}</p>
                                                            <p className="text-xs text-gray-500 truncate">{payout.volunteer?.email ?? '—'}</p>
                                                            {payout.volunteer?.affiliateCode && (
                                                                <p className="text-xs font-mono text-blue-600 mt-0.5">{payout.volunteer.affiliateCode}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Payment details */}
                                                <td className="px-5 py-4">
                                                    <div className="space-y-1">
                                                        <p className="text-gray-700">{METHOD_LABEL[payout.method] ?? payout.method}</p>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                                                            <span className="font-mono">{payout.accountNumber}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-400">
                                                            {payout.commissionCount} commission{payout.commissionCount !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>

                                                    {/* Admin note (rejection reason) */}
                                                    {payout.adminNote && (
                                                        <div className="mt-2 max-w-xs bg-red-50 border border-red-100 rounded-lg px-2.5 py-2">
                                                            <p className="text-xs text-red-700">
                                                                <span className="font-semibold">Note: </span>
                                                                {payout.adminNote}
                                                            </p>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Amount */}
                                                <td className="px-5 py-4 text-right">
                                                    <span className="text-lg font-bold text-gray-900">
                                                        {formatEGP(payout.amount)}
                                                    </span>
                                                </td>

                                                {/* Status badge */}
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.badgeCls}`}>
                                                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {cfg.label}
                                                    </span>
                                                </td>

                                                {/* Date */}
                                                <td className="px-5 py-4">
                                                    <p className="text-gray-700 whitespace-nowrap">{formatDate(payout.createdAt)}</p>
                                                    {payout.processedAt && (
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            Processed: {formatDate(payout.processedAt)}
                                                        </p>
                                                    )}
                                                    {payout.processedBy?.name && (
                                                        <p className="text-xs text-gray-400">by {payout.processedBy.name}</p>
                                                    )}
                                                </td>

                                                {/* Action buttons */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {payout.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAction(payout._id, 'approved')}
                                                                    disabled={isActing}
                                                                    aria-label={`Approve payout for ${payout.volunteer?.name}`}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors whitespace-nowrap"
                                                                >
                                                                    {isActing
                                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                                        : <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    }
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRejectTarget(payout)}
                                                                    disabled={isActing}
                                                                    aria-label={`Reject payout for ${payout.volunteer?.name}`}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors whitespace-nowrap"
                                                                >
                                                                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}

                                                        {payout.status === 'approved' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAction(payout._id, 'paid')}
                                                                    disabled={isActing}
                                                                    aria-label={`Mark payout as paid for ${payout.volunteer?.name}`}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors whitespace-nowrap"
                                                                >
                                                                    {isActing
                                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                                        : <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    }
                                                                    Mark Paid
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRejectTarget(payout)}
                                                                    disabled={isActing}
                                                                    aria-label={`Reject approved payout for ${payout.volunteer?.name}`}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors whitespace-nowrap"
                                                                >
                                                                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    Reverse
                                                                </button>
                                                            </>
                                                        )}

                                                        {(payout.status === 'paid' || payout.status === 'rejected') && (
                                                            <span className="text-xs text-gray-400 italic">
                                                                {payout.status === 'paid' ? 'Completed' : 'Closed'}
                                                            </span>
                                                        )}
                                                    </div>
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
        </main>
    );
}
