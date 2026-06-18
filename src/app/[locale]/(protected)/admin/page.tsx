'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Users, Briefcase, GraduationCap, Building2, CheckCircle, XCircle, Eye, X, Mail, Banknote, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Stats {
    users: {
        total: number;
        companies: number;
        trainers: number;
        pendingApprovals: number;
    };
    jobs: {
        active: number;
    };
    courses: {
        total: number;
        published: number;
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

export default function AdminDashboardPage() {
    const t = useTranslations('AdminDashboard');
    const { data: session, status } = useSession();
    const [stats, setStats] = useState<Stats | null>(null);
    const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<PendingCompany | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

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
            const [statsRes, companiesRes, analyticsRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/companies/pending'),
                fetch('/api/admin/analytics'),
            ]);

            const statsData     = await statsRes.json();
            const companiesData = await companiesRes.json();
            const analyticsData = await analyticsRes.json();

            if (statsData.success)     setStats(statsData.data);
            if (companiesData.success) setPendingCompanies(companiesData.data.companies);
            if (analyticsData.success) setAnalytics(analyticsData.data);

        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

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
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="mt-2 text-gray-600">Manage platform users, jobs, and courses</p>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Users className="h-8 w-8 text-blue-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Building2 className="h-8 w-8 text-purple-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Companies</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.users.companies}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Briefcase className="h-8 w-8 text-green-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.jobs.active}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <GraduationCap className="h-8 w-8 text-yellow-600" aria-hidden="true" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Published Courses</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.courses.published}</p>
                                </div>
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
                </div>

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
