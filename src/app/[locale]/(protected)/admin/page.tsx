'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Users, Briefcase, GraduationCap, Building2, CheckCircle, XCircle, Eye, X, Mail, Banknote, TrendingUp, BarChart3, FileText, ClipboardList, AlertTriangle, BookOpen, Handshake, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Stats {
    users: {
        total: number;
        companies: number;
        trainers: number;
        volunteers?: number;
        pendingApprovals: number;
    };
    jobs: {
        active: number;
    };
    courses: {
        total: number;
        published: number;
    };
    enrollments?: {
        total: number;
    };
    applications?: {
        total: number;
    };
    resumes?: {
        total: number;
    };
}

// ── Analytics types ───────────────────────────────────────────────────────────

interface RoleCount      { role: string; count: number }
interface DailySignup    { date: string; count: number }
interface EnrollmentRow  {
    courseId:        string;
    title:           string;
    enrollmentCount: number;
    paidCount:       number;
    revenueEstimate: number;
    isFree:          boolean;
    courseType:      string;
}
interface AnalyticsSummary {
    totalUsers:    number;
    signups30d:    number;
    totalEnrolled: number;
    totalRevenue:  number;
}
interface AnalyticsData {
    summary:           AnalyticsSummary;
    rolesDistribution: RoleCount[];
    dailySignups:      DailySignup[];
    enrollmentSummary: EnrollmentRow[];
}

// ── Role display config ───────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
    user:      '#3B82F6',
    trainer:   '#8B5CF6',
    company:   '#F59E0B',
    admin:     '#EF4444',
    volunteer: '#10B981',
};

function formatEGP(n: number) {
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency', currency: 'EGP', maximumFractionDigits: 0,
    }).format(n);
}

interface PendingCompany {
    _id: string;
    name: string;
    email: string;
    profile?: {
        companyName?: string;
        companyBio?: string;
        facebook?: string;
        linkedin?: string;
        twitter?: string;
        instagram?: string;
    };
    createdAt: string;
}

interface Volunteer {
    _id: string;
    name: string;
    email: string;
    isActive: boolean;
    isVerified: boolean;
    affiliateCode?: string;
    createdAt: string;
}

interface VolunteerPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export default function AdminDashboardPage() {
    const t = useTranslations('AdminDashboard');
    const { data: session, status } = useSession();
    const [stats, setStats] = useState<Stats | null>(null);
    const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
    const [pendingCoursesCount, setPendingCoursesCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<PendingCompany | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    // ── Tab navigation ────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'overview' | 'volunteers'>('overview');

    // ── Volunteers panel state ────────────────────────────────────────────────
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [volunteerPagination, setVolunteerPagination] = useState<VolunteerPagination | null>(null);
    const [volunteerPage, setVolunteerPage] = useState(1);
    const [volunteerSearch, setVolunteerSearch] = useState('');
    const [volunteersLoading, setVolunteersLoading] = useState(false);
    const [volunteersError, setVolunteersError] = useState('');
    // Track whether the first fetch has happened so we only call the API once on tab open
    const hasFetchedVolunteers = useRef(false);

    useEffect(() => {
        if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
            redirect('/dashboard');
        }

        if (status === 'authenticated' && session.user.role === 'admin') {
            fetchData();
        }
    }, [status, session]);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, companiesRes, analyticsRes, pendingCoursesRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/companies/pending'),
                fetch('/api/admin/analytics'),
                fetch('/api/admin/pending-courses-count'),
            ]);

            const statsData          = await statsRes.json();
            const companiesData      = await companiesRes.json();
            const analyticsData      = await analyticsRes.json();
            const pendingCoursesData = await pendingCoursesRes.json();

            if (statsData.success)          setStats(statsData.data);
            if (companiesData.success)      setPendingCompanies(companiesData.data.companies);
            if (analyticsData.success)      setAnalytics(analyticsData.data);
            if (pendingCoursesData.success) setPendingCoursesCount(pendingCoursesData.data.count ?? 0);

        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchVolunteers = useCallback(async (page = 1, search = '') => {
        setVolunteersLoading(true);
        setVolunteersError('');
        try {
            const params = new URLSearchParams({ page: String(page), limit: '10' });
            if (search.trim()) params.set('search', search.trim());
            const res  = await fetch(`/api/admin/volunteers?${params}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || 'Failed to load volunteers');
            setVolunteers(json.data.volunteers);
            setVolunteerPagination(json.data.pagination);
        } catch (err: any) {
            setVolunteersError(err.message || 'Something went wrong');
        } finally {
            setVolunteersLoading(false);
        }
    }, []);

    // Fetch volunteers lazily — only when the volunteers tab is first opened,
    // then re-fetch whenever the page number changes via pagination controls.
    useEffect(() => {
        if (status !== 'authenticated') return;
        if (activeTab !== 'volunteers') return;
        if (!hasFetchedVolunteers.current) {
            hasFetchedVolunteers.current = true;
            fetchVolunteers(volunteerPage, volunteerSearch);
            return;
        }
        // Subsequent calls: page change triggered from pagination buttons
        fetchVolunteers(volunteerPage, volunteerSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, volunteerPage, status]);

    const handleApprove = async (companyId: string) => {
        if (!confirm('Approve this company?')) return;

        try {
            const response = await fetch(`/api/admin/companies/${companyId}/approve`, {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                alert('Company approved successfully!');
                fetchData(); // Refresh data
            } else {
                alert(data.error?.message || 'Failed to approve company');
            }
        } catch (error) {
            console.error('Approval error:', error);
            alert('An error occurred');
        }
    };

    const handleReject = async (companyId: string) => {
        if (!confirm('Are you sure you want to reject this company? This will permanently delete their account.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/companies/${companyId}/reject`, {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                alert('Company rejected and removed successfully!');
                fetchData(); // Refresh data
            } else {
                alert(data.error?.message || 'Failed to reject company');
            }
        } catch (error) {
            console.error('Rejection error:', error);
            alert('An error occurred');
        }
    };

    if (loading) {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
                </div>
            </main>
        );
    }

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* ── Page header ───────────────────────────────────────────── */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="mt-2 text-gray-600">Manage platform users, jobs, and courses</p>
                </div>

                {/* ── Tab navigation bar ────────────────────────────────────── */}
                <div className="mb-8 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit" role="tablist" aria-label="Dashboard sections">
                    <button
                        id="tab-overview"
                        role="tab"
                        aria-selected={activeTab === 'overview'}
                        aria-controls="tabpanel-overview"
                        onClick={() => setActiveTab('overview')}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            activeTab === 'overview'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <BarChart3 className="h-4 w-4" aria-hidden="true" />
                        Overview
                    </button>
                    <button
                        id="tab-volunteers"
                        role="tab"
                        aria-selected={activeTab === 'volunteers'}
                        aria-controls="tabpanel-volunteers"
                        onClick={() => setActiveTab('volunteers')}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                            activeTab === 'volunteers'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Handshake className="h-4 w-4" aria-hidden="true" />
                        Volunteers
                        {volunteerPagination && (
                            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                {volunteerPagination.total}
                            </span>
                        )}
                    </button>
                </div>

                {/* ════════════════════════════════════════════════════════════ */}
                {/* OVERVIEW TAB                                               */}
                {/* ════════════════════════════════════════════════════════════ */}
                <div
                    id="tabpanel-overview"
                    role="tabpanel"
                    aria-labelledby="tab-overview"
                    hidden={activeTab !== 'overview'}
                >

                {/* ── Pending Course Approvals Alert Banner ──────────────────── */}
                {pendingCoursesCount > 0 && (
                    <Link
                        href="/admin/course-approvals"
                        className="group mb-8 flex items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm hover:border-amber-400 hover:bg-amber-100 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        aria-label={`${pendingCoursesCount} course${pendingCoursesCount > 1 ? 's' : ''} awaiting approval — click to review`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                                {/* Pulsing ring to draw attention */}
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-60" aria-hidden="true" />
                                <AlertTriangle className="h-5 w-5 text-amber-600 relative" aria-hidden="true" />
                            </span>
                            <div>
                                <p className="font-semibold text-amber-900">
                                    {pendingCoursesCount} Course{pendingCoursesCount > 1 ? 's' : ''} Awaiting Your Approval
                                </p>
                                <p className="text-sm text-amber-700">
                                    موافقات الكورسات — Trainers are waiting for review before going live.
                                </p>
                            </div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm group-hover:bg-amber-700 transition-colors">
                            Review Now →
                        </span>
                    </Link>
                )}

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Users Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-blue-50 p-3 rounded-lg">
                                    <Users className="h-6 w-6 text-blue-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">{t('totalUsers')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 text-xs text-gray-500">
                                <span>{t('users')}: {stats.users.total - stats.users.trainers - stats.users.companies - (stats.users.volunteers || 0)}</span>
                                <span>• {t('trainers')}: {stats.users.trainers}</span>
                                <span>• {t('companies')}: {stats.users.companies}</span>
                                <span>• {t('volunteers')}: {stats.users.volunteers || 0}</span>
                            </div>
                        </div>

                        {/* Enrollments Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-emerald-50 p-3 rounded-lg">
                                    <GraduationCap className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">{t('totalEnrollments')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.enrollments?.total || 0}</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                                {t('platformWideEnrollments')}
                            </div>
                        </div>

                        {/* Applications Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-purple-50 p-3 rounded-lg">
                                    <ClipboardList className="h-6 w-6 text-purple-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">{t('jobApplications')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.applications?.total || 0}</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                                {t('submittedApplications')}
                            </div>
                        </div>

                        {/* Resumes Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-orange-50 p-3 rounded-lg">
                                    <FileText className="h-6 w-6 text-orange-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">{t('resumesCreated')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.resumes?.total || 0}</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                                {t('resumesBuilderUsage')}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Analytics Section ───────────────────────────────────────── */}
                {analytics && (
                    <div className="mb-8 space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" aria-hidden="true" />
                            Platform Analytics
                        </h2>

                        {/* Summary KPI row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {([
                                { label: 'Total Users',    value: analytics.summary.totalUsers,    icon: Users,         color: 'text-blue-600',    bg: 'bg-blue-50'    },
                                { label: 'Signups (30d)',  value: analytics.summary.signups30d,    icon: TrendingUp,    color: 'text-purple-600',  bg: 'bg-purple-50'  },
                                { label: 'Enrollments',   value: analytics.summary.totalEnrolled, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Revenue (Est.)', value: analytics.summary.totalRevenue, icon: Banknote,      color: 'text-amber-600',   bg: 'bg-amber-50'   },
                            ] as { label: string; value: number; icon: React.ElementType; color: string; bg: string }[]).map((kpi) => {
                                const Icon = kpi.icon;
                                return (
                                    <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                                        <div className={`${kpi.bg} rounded-lg p-2.5`} aria-hidden="true">
                                            <Icon className={`h-5 w-5 ${kpi.color}`} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">{kpi.label}</p>
                                            <p className="text-xl font-bold text-gray-900">
                                                {kpi.label === 'Revenue (Est.)'
                                                    ? formatEGP(kpi.value)
                                                    : kpi.value.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Roles Distribution Bar */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Roles Distribution</h3>
                                <div className="space-y-3" role="list" aria-label="User role distribution">
                                    {analytics.rolesDistribution.map((r) => {
                                        const pct = analytics.summary.totalUsers > 0
                                            ? Math.round((r.count / analytics.summary.totalUsers) * 100)
                                            : 0;
                                        const color = ROLE_COLORS[r.role] ?? '#6B7280';
                                        return (
                                            <div key={r.role} className="space-y-1" role="listitem">
                                                <div className="flex justify-between text-xs">
                                                    <span className="font-medium text-gray-700 capitalize">{r.role}</span>
                                                    <span className="text-gray-500">{r.count} ({pct}%)</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%`, backgroundColor: color }}
                                                        role="progressbar"
                                                        aria-valuenow={pct}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-label={`${r.role}: ${pct}%`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Daily Signups Sparkline — pure SVG, no external deps */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                                <h3 className="text-sm font-semibold text-gray-700 mb-1">Daily Signups (Last 30 Days)</h3>
                                <p className="text-xs text-gray-400 mb-4">
                                    {analytics.summary.signups30d} new users in the last 30 days
                                </p>
                                {(() => {
                                    const data   = analytics.dailySignups;
                                    const maxVal = Math.max(...data.map((d) => d.count), 1);
                                    const W = 340; const H = 80; const pad = 4;
                                    const pts = data.map((d, i) => {
                                        const x = pad + (i / (data.length - 1)) * (W - 2 * pad);
                                        const y = H - pad - ((d.count / maxVal) * (H - 2 * pad));
                                        return `${x},${y}`;
                                    }).join(' ');
                                    // Area fill path
                                    const firstX = pad;
                                    const lastX  = pad + (W - 2 * pad);
                                    const areaPath = `M ${firstX},${H - pad} L ${pts.split(' ').map(p => p).join(' L ')} L ${lastX},${H - pad} Z`;
                                    return (
                                        <svg
                                            viewBox={`0 0 ${W} ${H}`}
                                            className="w-full h-20"
                                            aria-label="Daily signups sparkline chart"
                                            role="img"
                                        >
                                            {/* Area fill */}
                                            <defs>
                                                <linearGradient id="spark-gradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%"  stopColor="#3B82F6" stopOpacity="0.25" />
                                                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                                                </linearGradient>
                                            </defs>
                                            <path d={areaPath} fill="url(#spark-gradient)" />
                                            {/* Line */}
                                            <polyline
                                                points={pts}
                                                fill="none"
                                                stroke="#3B82F6"
                                                strokeWidth="2"
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                            />
                                            {/* Dots on non-zero days */}
                                            {data.map((d, i) => {
                                                if (d.count === 0) return null;
                                                const [x, y] = (pts.split(' ')[i] ?? '0,0').split(',').map(Number);
                                                return (
                                                    <circle
                                                        key={i}
                                                        cx={x} cy={y} r="2.5"
                                                        fill="#3B82F6"
                                                        aria-label={`${d.date}: ${d.count} signups`}
                                                    />
                                                );
                                            })}
                                        </svg>
                                    );
                                })()}
                                {/* X-axis labels: first, mid, last */}
                                <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                                    <span>{analytics.dailySignups[0]?.date.slice(5) ?? ''}</span>
                                    <span>{analytics.dailySignups[14]?.date.slice(5) ?? ''}</span>
                                    <span>{analytics.dailySignups[29]?.date.slice(5) ?? ''}</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Courses by Enrollment */}
                        {analytics.enrollmentSummary.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-700">Top Courses by Enrollment</h3>
                                    <Link href="/admin/courses" className="text-xs text-blue-600 hover:underline">View all →</Link>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Course</th>
                                                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Enrolled</th>
                                                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                                                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Rev. Est.</th>
                                                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">{t('actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {analytics.enrollmentSummary.map((c) => (
                                                <tr key={c.courseId} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-5 py-3 font-medium text-gray-900 max-w-[260px]">
                                                        <span className="line-clamp-1">{c.title}</span>
                                                        {c.isFree && (
                                                            <span className="ml-2 text-xs text-emerald-600 font-normal">Free</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 text-right font-bold text-gray-900">{c.enrollmentCount}</td>
                                                    <td className="px-5 py-3 text-right text-gray-600">{c.paidCount}</td>
                                                    <td className="px-5 py-3 text-right font-semibold text-emerald-700">
                                                        {c.revenueEstimate > 0 ? formatEGP(c.revenueEstimate) : '—'}
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <Link href={`/admin/courses/${c.courseId}`} className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                                            {t('viewAnalytics')}
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Pending Approvals */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Pending Company Approvals
                        {pendingCompanies.length > 0 && (
                            <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                {pendingCompanies.length}
                            </span>
                        )}
                    </h2>

                    {pendingCompanies.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" aria-hidden="true" />
                            <p>No pending approvals</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingCompanies.map((company) => (
                                <div
                                    key={company._id}
                                    className="flex flex-col p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">
                                                {company.profile?.companyName || company.name}
                                            </h3>
                                            <p className="text-sm text-gray-600">{company.email}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Registered: {new Date(company.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => {
                                                    setSelectedCompany(company);
                                                    setReviewModalOpen(true);
                                                }}
                                                size="sm"
                                                variant="secondary"
                                                aria-label={`Review ${company.name} details`}
                                            >
                                                <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                                                Review
                                            </Button>
                                            <Button
                                                onClick={() => handleApprove(company._id)}
                                                size="sm"
                                                variant="primary"
                                                aria-label={`Approve ${company.name}`}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                                Approve
                                            </Button>
                                            <Button
                                                onClick={() => handleReject(company._id)}
                                                size="sm"
                                                variant="danger"
                                                aria-label={`Reject ${company.name}`}
                                            >
                                                <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                    {company.profile?.companyBio && (
                                        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                                            <p className="text-xs font-semibold text-gray-700 mb-1">Company Description:</p>
                                            <p className="text-sm text-gray-600">{company.profile.companyBio}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Link
                        href="/admin/orders"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <CheckCircle className="h-8 w-8 text-orange-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Payment Orders</h3>
                        <p className="mt-1 text-sm text-gray-600">Review manual payments</p>
                    </Link>

                    <Link
                        href="/jobs"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <Briefcase className="h-8 w-8 text-green-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Browse Jobs</h3>
                        <p className="mt-1 text-sm text-gray-600">View all job postings</p>
                    </Link>

                    <Link
                        href="/courses"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <GraduationCap className="h-8 w-8 text-yellow-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Browse Courses</h3>
                        <p className="mt-1 text-sm text-gray-600">View all available courses</p>
                    </Link>

                    <Link
                        href="/notifications"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <Users className="h-8 w-8 text-blue-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        <p className="mt-1 text-sm text-gray-600">View your notifications</p>
                    </Link>

                    <Link
                        href="/admin/broadcast"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <Mail className="h-8 w-8 text-purple-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Broadcast Email</h3>
                        <p className="mt-1 text-sm text-gray-600">Send email to all users</p>
                    </Link>

                    <Link
                        href="/admin/payouts"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <Banknote className="h-8 w-8 text-emerald-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Affiliate Payouts</h3>
                        <p className="mt-1 text-sm text-gray-600">Review volunteer withdrawals</p>
                    </Link>

                    <Link
                        href="/admin/trainers"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <Users className="h-8 w-8 text-indigo-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Trainer Roster</h3>
                        <p className="mt-1 text-sm text-gray-600">Review trainer applications</p>
                    </Link>

                    <Link
                        href="/admin/courses"
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                        <BarChart3 className="h-8 w-8 text-rose-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Course Intelligence</h3>
                        <p className="mt-1 text-sm text-gray-600">Enrollments &amp; revenue data</p>
                    </Link>

                    {/* Course Approvals — prominent card with live pending badge */}
                    <Link
                        href="/admin/course-approvals"
                        className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-amber-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                        {/* Live badge — only rendered when there are pending courses */}
                        {pendingCoursesCount > 0 && (
                            <span
                                className="absolute -top-2 -right-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow"
                                aria-label={`${pendingCoursesCount} pending`}
                            >
                                {pendingCoursesCount}
                            </span>
                        )}
                        <BookOpen className="h-8 w-8 text-amber-600 mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-900">Course Approvals</h3>
                        <p className="mt-1 text-sm text-gray-600">موافقات الكورسات — Review &amp; publish trainer courses</p>
                    </Link>
                </div>
                </div>{/* end tabpanel-overview */}

                {/* ════════════════════════════════════════════════════════════ */}
                {/* VOLUNTEERS TAB                                              */}
                {/* ════════════════════════════════════════════════════════════ */}
                <div
                    id="tabpanel-volunteers"
                    role="tabpanel"
                    aria-labelledby="tab-volunteers"
                    hidden={activeTab !== 'volunteers'}
                >
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Panel header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Handshake className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Registered Volunteers
                                    {volunteerPagination && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                            {volunteerPagination.total} total
                                        </span>
                                    )}
                                </h2>
                            </div>
                            {/* Search */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                                    <input
                                        id="volunteer-search"
                                        type="search"
                                        placeholder="Search name or email…"
                                        value={volunteerSearch}
                                        onChange={(e) => {
                                            setVolunteerSearch(e.target.value);
                                            setVolunteerPage(1);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') fetchVolunteers(1, volunteerSearch);
                                        }}
                                        className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        aria-label="Search volunteers by name or email"
                                    />
                                </div>
                                <button
                                    onClick={() => fetchVolunteers(1, volunteerSearch)}
                                    className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    Search
                                </button>
                            </div>
                        </div>

                        {/* Body: error / skeleton / empty / table */}
                        {volunteersError ? (
                            <div className="px-6 py-10 text-center" role="alert">
                                <XCircle className="mx-auto h-10 w-10 text-red-400 mb-2" aria-hidden="true" />
                                <p className="text-sm font-medium text-red-600">{volunteersError}</p>
                                <button
                                    onClick={() => fetchVolunteers(volunteerPage, volunteerSearch)}
                                    className="mt-3 text-sm text-red-500 underline hover:text-red-700"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : volunteersLoading ? (
                            <div className="divide-y divide-gray-50" aria-busy="true" aria-label="Loading volunteers…">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                                        <div className="h-4 bg-gray-200 rounded w-1/4" />
                                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                                        <div className="h-5 bg-gray-200 rounded-full w-16" />
                                        <div className="h-4 bg-gray-200 rounded w-24" />
                                        <div className="h-4 bg-gray-200 rounded w-24 ml-auto" />
                                    </div>
                                ))}
                            </div>
                        ) : volunteers.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <Handshake className="mx-auto h-14 w-14 text-gray-200 mb-4" aria-hidden="true" />
                                <p className="text-base font-semibold text-gray-500">No volunteers found</p>
                                {volunteerSearch && (
                                    <p className="text-sm text-gray-400 mt-1">
                                        No results for &ldquo;{volunteerSearch}&rdquo;. Try clearing the search.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm" aria-label="Volunteers table">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                            <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Affiliate Code</th>
                                            <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {volunteers.map((vol) => (
                                            <tr key={vol._id} className="hover:bg-gray-50/70 transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">{vol.name}</td>
                                                <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{vol.email}</td>
                                                <td className="px-5 py-3.5">
                                                    {vol.isActive ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                            <CheckCircle className="h-3 w-3" aria-hidden="true" /> Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                            <XCircle className="h-3 w-3" aria-hidden="true" /> Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {vol.affiliateCode ? (
                                                        <code className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-mono tracking-wide">
                                                            {vol.affiliateCode}
                                                        </code>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Not generated</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                                                    {new Date(vol.createdAt).toLocaleDateString('en-GB', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                    })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination footer */}
                        {volunteerPagination && volunteerPagination.totalPages > 1 && (
                            <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between text-sm">
                                <span className="text-gray-500">
                                    Page <strong>{volunteerPagination.page}</strong> of {volunteerPagination.totalPages}
                                    <span className="ml-2 text-gray-400">({volunteerPagination.total} total)</span>
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const prev = volunteerPage - 1;
                                            setVolunteerPage(prev);
                                        }}
                                        disabled={!volunteerPagination.hasPrevPage}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                                    </button>
                                    <button
                                        onClick={() => {
                                            const next = volunteerPage + 1;
                                            setVolunteerPage(next);
                                        }}
                                        disabled={!volunteerPagination.hasNextPage}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                        aria-label="Next page"
                                    >
                                        Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>{/* end tabpanel-volunteers */}

                {/* Company Review Modal */}
                {reviewModalOpen && selectedCompany && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900">Company Registration Details</h2>
                                <button
                                    onClick={() => {
                                        setReviewModalOpen(false);
                                        setSelectedCompany(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                    aria-label="Close modal"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="px-6 py-6 space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
                                    <dl className="space-y-2">
                                        <div>
                                            <dt className="text-xs font-medium text-gray-500">Company Name</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {selectedCompany.profile?.companyName || 'Not provided'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-medium text-gray-500">Contact Person</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{selectedCompany.name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-medium text-gray-500">Email</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{selectedCompany.email}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-medium text-gray-500">Registration Date</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {new Date(selectedCompany.createdAt).toLocaleString()}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Company Description */}
                                {selectedCompany.profile?.companyBio && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Company Description</h3>
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                {selectedCompany.profile.companyBio}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Social Media */}
                                {(selectedCompany.profile?.linkedin ||
                                    selectedCompany.profile?.facebook ||
                                    selectedCompany.profile?.twitter ||
                                    selectedCompany.profile?.instagram) && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Social Media Links</h3>
                                            <dl className="space-y-2">
                                                {selectedCompany.profile?.linkedin && (
                                                    <div>
                                                        <dt className="text-xs font-medium text-gray-500">LinkedIn</dt>
                                                        <dd className="mt-1">
                                                            <a
                                                                href={selectedCompany.profile.linkedin}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:underline break-all"
                                                            >
                                                                {selectedCompany.profile.linkedin}
                                                            </a>
                                                        </dd>
                                                    </div>
                                                )}
                                                {selectedCompany.profile?.facebook && (
                                                    <div>
                                                        <dt className="text-xs font-medium text-gray-500">Facebook</dt>
                                                        <dd className="mt-1">
                                                            <a
                                                                href={selectedCompany.profile.facebook}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:underline break-all"
                                                            >
                                                                {selectedCompany.profile.facebook}
                                                            </a>
                                                        </dd>
                                                    </div>
                                                )}
                                                {selectedCompany.profile?.twitter && (
                                                    <div>
                                                        <dt className="text-xs font-medium text-gray-500">Twitter / X</dt>
                                                        <dd className="mt-1">
                                                            <a
                                                                href={selectedCompany.profile.twitter}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:underline break-all"
                                                            >
                                                                {selectedCompany.profile.twitter}
                                                            </a>
                                                        </dd>
                                                    </div>
                                                )}
                                                {selectedCompany.profile?.instagram && (
                                                    <div>
                                                        <dt className="text-xs font-medium text-gray-500">Instagram</dt>
                                                        <dd className="mt-1">
                                                            <a
                                                                href={selectedCompany.profile.instagram}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:underline break-all"
                                                            >
                                                                {selectedCompany.profile.instagram}
                                                            </a>
                                                        </dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </div>
                                    )}
                            </div>

                            {/* Modal Actions */}
                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
                                <Button
                                    onClick={() => {
                                        setReviewModalOpen(false);
                                        setSelectedCompany(null);
                                    }}
                                    variant="secondary"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={() => {
                                        handleApprove(selectedCompany._id);
                                        setReviewModalOpen(false);
                                        setSelectedCompany(null);
                                    }}
                                    variant="primary"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve Company
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
