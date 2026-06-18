'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession }   from 'next-auth/react';
import { redirect }     from 'next/navigation';
import Link             from 'next/link';
import { Users, ChevronLeft, Search } from 'lucide-react';
import TrainerCard, { type TrainerCardData } from '@/components/admin/TrainerCard';

// ─── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface Counts { all: number; pending: number; approved: number; rejected: number }

const TABS: { key: StatusFilter; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'approved', label: 'Approved' },
    { key: 'pending',  label: 'Pending'  },
    { key: 'rejected', label: 'Rejected' },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminTrainersPage() {
    const { data: session, status } = useSession();

    const [trainers,    setTrainers]    = useState<TrainerCardData[]>([]);
    const [counts,      setCounts]      = useState<Counts>({ all: 0, pending: 0, approved: 0, rejected: 0 });
    const [activeTab,   setActiveTab]   = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading,   setIsLoading]   = useState(true);
    const [error,       setError]       = useState<string | null>(null);

    const fetchTrainers = useCallback(async (tab: StatusFilter) => {
        setIsLoading(true);
        setError(null);
        try {
            const statusParam = tab !== 'all' ? `&status=${tab}` : '';
            const res  = await fetch(`/api/admin/trainers?limit=50${statusParam}`);
            const json = await res.json();
            if (json.success) {
                setTrainers(json.data.trainers);
                setCounts(json.data.counts);
            } else {
                setError('Failed to load trainers');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user?.role === 'admin') {
            fetchTrainers(activeTab);
        }
    }, [session, activeTab, fetchTrainers]);

    // ── Auth ──────────────────────────────────────────────────────────────────
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

    // ── Client-side search filter ─────────────────────────────────────────────
    const filtered = trainers.filter((t) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            t.name.toLowerCase().includes(q) ||
            t.email.toLowerCase().includes(q) ||
            t.specialization.toLowerCase().includes(q)
        );
    });

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <Link
                            href="/admin"
                            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-1"
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            Admin Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">Trainer Roster</h1>
                        <p className="mt-1 text-gray-600">
                            {counts.all} total trainer{counts.all !== 1 ? 's' : ''} registered on the platform
                        </p>
                    </div>
                </div>

                {/* ── Filter tabs + Search ─────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Tabs */}
                    <nav
                        className="flex gap-1 p-1.5 bg-white rounded-2xl border border-gray-200 shadow-sm"
                        role="tablist"
                        aria-label="Filter trainers by status"
                    >
                        {TABS.map((tab) => {
                            const count    = counts[tab.key];
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {tab.label}
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ${
                                        isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Search */}
                    <div className="relative flex-1 w-full sm:max-w-xs">
                        <Search
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
                            aria-hidden="true"
                        />
                        <label htmlFor="trainer-search" className="sr-only">Search trainers</label>
                        <input
                            id="trainer-search"
                            type="search"
                            placeholder="Search by name, email or specialty…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        />
                    </div>

                    {/* Result count */}
                    {!isLoading && (
                        <p className="text-sm text-gray-500 whitespace-nowrap">
                            Showing <strong>{filtered.length}</strong> of <strong>{trainers.length}</strong>
                        </p>
                    )}
                </div>

                {/* ── Content ──────────────────────────────────────────────── */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl border border-gray-200 h-64 animate-pulse"
                                aria-hidden="true"
                            />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-red-200">
                        <p className="text-red-600 font-medium">{error}</p>
                        <button
                            type="button"
                            onClick={() => fetchTrainers(activeTab)}
                            className="mt-4 px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                        <Users className="h-14 w-14 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                        <p className="font-semibold text-gray-600">
                            {searchQuery ? `No trainers match "${searchQuery}"` : `No ${activeTab !== 'all' ? activeTab : ''} trainers found`}
                        </p>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="mt-3 text-sm text-blue-600 hover:underline"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filtered.map((trainer) => (
                            <TrainerCard key={trainer._id} trainer={trainer} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
