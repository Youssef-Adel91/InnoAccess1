'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    X,
    Handshake,
    Search,
    ChevronLeft,
    ChevronRight,
    Users,
    TrendingUp,
    DollarSign,
    AlertCircle,
    Loader2,
    BarChart3,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Volunteer {
    _id: string;
    name: string;
    email: string;
    isActive: boolean;
    affiliateCode?: string;
    createdAt: string;
    totalSalesCount: number;
    totalOwed: number;
    totalRevenue: number;
}

interface SaleRecord {
    _id: string;
    createdAt: string;
    courseTitle: string;
    saleAmount: number;
    commissionAmount: number;
    commissionRate: number;
    status: 'pending' | 'available' | 'paid';
}

interface Pagination {
    page: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatEGP(n: number) {
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        maximumFractionDigits: 0,
    }).format(n);
}

function statusBadge(status: SaleRecord['status']) {
    const map = {
        pending:   'bg-yellow-100 text-yellow-700',
        available: 'bg-emerald-100 text-emerald-700',
        paid:      'bg-blue-100 text-blue-700',
    } as const;
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    );
}

// ─── Sales Detail Modal ────────────────────────────────────────────────────────

interface SalesModalProps {
    volunteer: Volunteer;
    onClose: () => void;
}

function SalesModal({ volunteer, onClose }: SalesModalProps) {
    const [sales, setSales]           = useState<SaleRecord[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [page, setPage]             = useState(1);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const dialogRef                   = useRef<HTMLDivElement>(null);

    const fetchSales = useCallback(async (p: number) => {
        setLoading(true);
        setError('');
        try {
            const res  = await fetch(`/api/admin/volunteers/${volunteer._id}/sales?page=${p}&limit=15`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || 'Failed to load sales');
            setSales(json.data.sales);
            setPagination(json.data.pagination);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, [volunteer._id]);

    useEffect(() => { fetchSales(page); }, [page, fetchSales]);

    // Trap focus & close on Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        dialogRef.current?.focus();
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl outline-none overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div>
                        <h2 id="sales-modal-title" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Handshake className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                            {volunteer.name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">{volunteer.email}</p>
                        {volunteer.affiliateCode && (
                            <code className="mt-1 inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-mono tracking-wide">
                                {volunteer.affiliateCode}
                            </code>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Summary KPI strip */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                    <div className="px-6 py-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Total Sales</p>
                        <p className="text-2xl font-bold text-gray-900">{volunteer.totalSalesCount}</p>
                    </div>
                    <div className="px-6 py-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">{formatEGP(volunteer.totalRevenue)}</p>
                    </div>
                    <div className="px-6 py-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Commission Owed</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatEGP(volunteer.totalOwed)}</p>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {error ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <AlertCircle className="h-10 w-10 text-red-400 mb-3" aria-hidden="true" />
                            <p className="text-sm font-medium text-red-600">{error}</p>
                            <button
                                onClick={() => fetchSales(page)}
                                className="mt-3 text-sm text-red-500 underline hover:text-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center py-16" aria-label="Loading sales…" aria-busy="true">
                            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" aria-hidden="true" />
                        </div>
                    ) : sales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <BarChart3 className="h-12 w-12 text-gray-200 mb-3" aria-hidden="true" />
                            <p className="text-sm font-medium text-gray-500">No sales recorded yet</p>
                            <p className="text-xs text-gray-400 mt-1">Sales will appear here once customers use this volunteer&apos;s code.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm" aria-label="Sales history">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course / Item</th>
                                    <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Sale Price</th>
                                    <th scope="col" className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                                    <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sales.map((sale) => (
                                    <tr key={sale._id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                                            {new Date(sale.createdAt).toLocaleDateString('en-GB', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                            })}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-900 font-medium max-w-[220px]">
                                            <span className="line-clamp-1">{sale.courseTitle}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right text-gray-700">{formatEGP(sale.saleAmount)}</td>
                                        <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">{formatEGP(sale.commissionAmount)}</td>
                                        <td className="px-5 py-3.5">{statusBadge(sale.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/60 text-sm">
                        <span className="text-gray-500">
                            Page <strong>{pagination.page}</strong> of {pagination.totalPages}
                            <span className="ml-2 text-gray-400">({pagination.total} records)</span>
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => p - 1)}
                                disabled={!pagination.hasPrevPage}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                            </button>
                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={!pagination.hasNextPage}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                aria-label="Next page"
                            >
                                Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Volunteer Card ─────────────────────────────────────────────────────────────

interface VolunteerCardProps {
    vol: Volunteer;
    onSelect: (vol: Volunteer) => void;
}

function VolunteerCard({ vol, onSelect }: VolunteerCardProps) {
    return (
        <button
            onClick={() => onSelect(vol)}
            className="w-full text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group"
            aria-label={`View sales details for ${vol.name}`}
        >
            {/* Name + status */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-emerald-700 font-bold text-sm">
                            {vol.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-emerald-700 transition-colors">
                            {vol.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{vol.email}</p>
                    </div>
                </div>
                <span className={`shrink-0 ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${vol.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {vol.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>

            {/* Affiliate code */}
            {vol.affiliateCode && (
                <code className="block mb-3 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-mono tracking-wide w-fit">
                    {vol.affiliateCode}
                </code>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500 shrink-0" aria-hidden="true" />
                    <div>
                        <p className="text-xs text-gray-500 leading-none">Sales</p>
                        <p className="text-sm font-bold text-gray-900 leading-tight">{vol.totalSalesCount}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 rounded-lg px-3 py-2">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <div>
                        <p className="text-xs text-gray-500 leading-none">Owed</p>
                        <p className="text-sm font-bold text-emerald-700 leading-tight">{formatEGP(vol.totalOwed)}</p>
                    </div>
                </div>
            </div>

            <p className="mt-3 text-xs text-center text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                Click to view sales history →
            </p>
        </button>
    );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export default function AdminVolunteersPanel() {
    const [open, setOpen]                   = useState(false);
    const [volunteers, setVolunteers]       = useState<Volunteer[]>([]);
    const [pagination, setPagination]       = useState<Pagination | null>(null);
    const [page, setPage]                   = useState(1);
    const [search, setSearch]               = useState('');
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState('');
    const [selectedVol, setSelectedVol]     = useState<Volunteer | null>(null);
    const hasFetched                        = useRef(false);

    const fetchVolunteers = useCallback(async (p: number, q: string) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: String(p), limit: '12' });
            if (q.trim()) params.set('search', q.trim());
            const res  = await fetch(`/api/admin/volunteers?${params}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || 'Failed to load');
            setVolunteers(json.data.volunteers);
            setPagination(json.data.pagination);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch lazily on first open, refetch when page changes
    useEffect(() => {
        if (!open) return;
        if (!hasFetched.current) {
            hasFetched.current = true;
            fetchVolunteers(1, '');
            return;
        }
        fetchVolunteers(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, page]);

    const handleSearch = () => {
        setPage(1);
        hasFetched.current = true; // allow re-fetch
        fetchVolunteers(1, search);
    };

    return (
        <>
            {/* Trigger button */}
            <button
                id="btn-see-volunteers"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all duration-150 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
                <Handshake className="h-4 w-4" aria-hidden="true" />
                See Volunteers
                {pagination && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                        {pagination.total}
                    </span>
                )}
            </button>

            {/* Overlay panel */}
            {open && (
                <div
                    className="fixed inset-0 z-40 flex flex-col bg-gray-50"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Volunteers management panel"
                >
                    {/* Panel top bar */}
                    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-100">
                                <Users className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Volunteer Management</h2>
                                {pagination && (
                                    <p className="text-xs text-gray-500">{pagination.total} volunteers registered</p>
                                )}
                            </div>
                        </div>

                        {/* Search */}
                        <div className="flex items-center gap-2 flex-1 max-w-sm mx-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                    placeholder="Search name or email…"
                                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    aria-label="Search volunteers"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                Search
                            </button>
                        </div>

                        <button
                            onClick={() => setOpen(false)}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                            aria-label="Close volunteers panel"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <AlertCircle className="h-10 w-10 text-red-400 mb-3" aria-hidden="true" />
                                <p className="text-sm font-medium text-red-600">{error}</p>
                                <button
                                    onClick={() => fetchVolunteers(page, search)}
                                    className="mt-3 text-sm text-red-500 underline hover:text-red-700"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : loading ? (
                            /* Skeleton grid */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-9 h-9 rounded-full bg-gray-200" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                                            </div>
                                        </div>
                                        <div className="h-6 bg-gray-200 rounded w-24 mb-3" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="h-12 bg-gray-100 rounded-lg" />
                                            <div className="h-12 bg-gray-100 rounded-lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : volunteers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <Handshake className="h-16 w-16 text-gray-200 mb-4" aria-hidden="true" />
                                <p className="text-base font-semibold text-gray-500">No volunteers found</p>
                                {search && (
                                    <p className="text-sm text-gray-400 mt-1">
                                        No results for &ldquo;{search}&rdquo;. Try clearing the search.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {volunteers.map((vol) => (
                                    <VolunteerCard
                                        key={vol._id}
                                        vol={vol}
                                        onSelect={setSelectedVol}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination footer */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                                Page <strong>{pagination.page}</strong> of {pagination.totalPages}
                                <span className="ml-2 text-gray-400">({pagination.total} total)</span>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => p - 1)}
                                    disabled={!pagination.hasPrevPage}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                                </button>
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={!pagination.hasNextPage}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    aria-label="Next page"
                                >
                                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sales detail modal */}
            {selectedVol && (
                <SalesModal
                    volunteer={selectedVol}
                    onClose={() => setSelectedVol(null)}
                />
            )}
        </>
    );
}
