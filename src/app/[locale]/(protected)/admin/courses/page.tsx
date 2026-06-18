'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession }   from 'next-auth/react';
import { redirect }     from 'next/navigation';
import Link             from 'next/link';
import {
    GraduationCap, ChevronLeft, TrendingUp, Users, Banknote,
    Search, Radio, PlayCircle, CheckCircle, XCircle,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CourseIntelligence {
    courseId:              string;
    title:                 string;
    thumbnail?:            string;
    courseType:            'RECORDED' | 'LIVE';
    isFree:                boolean;
    price:                 number;
    isPublished:           boolean;
    liveEnrollmentCount:   number;
    cachedEnrollmentCount: number;
    paidEnrollments:       number;
    revenueEstimate:       number;
    trainerName?:          string;
    trainerEmail?:         string;
    trainerAvatar?:        string;
    trainerSpecialization?: string;
    createdAt:             string;
}

interface Totals { revenue: number; enrollments: number; courses: number }

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCoursesPage() {
    const { data: session, status } = useSession();

    const [courses,     setCourses]     = useState<CourseIntelligence[]>([]);
    const [totals,      setTotals]      = useState<Totals>({ revenue: 0, enrollments: 0, courses: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [pubFilter,   setPubFilter]   = useState<'all' | 'published' | 'draft'>('all');
    const [typeFilter,  setTypeFilter]  = useState<'all' | 'RECORDED' | 'LIVE'>('all');
    const [isLoading,   setIsLoading]   = useState(true);
    const [error,       setError]       = useState<string | null>(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchCourses = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const pubParam = pubFilter === 'published' ? '&published=true'
                           : pubFilter === 'draft'     ? '&published=false'
                           : '';
            const res  = await fetch(`/api/admin/courses/intelligence?limit=100${pubParam}`);
            const json = await res.json();
            if (json.success) {
                setCourses(json.data.courses);
                setTotals(json.data.totals);
            } else {
                setError('Failed to load course intelligence');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [pubFilter]);

    useEffect(() => {
        if (session?.user?.role === 'admin') fetchCourses();
    }, [session, fetchCourses]);

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

    // ── Client-side filter ────────────────────────────────────────────────────
    const filtered = courses.filter((c) => {
        const matchesSearch = !searchQuery ||
            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.trainerName ?? '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'all' || c.courseType === typeFilter;
        return matchesSearch && matchesType;
    });

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div>
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-1"
                    >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        Admin Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Course Intelligence</h1>
                    <p className="mt-1 text-gray-600">Live enrollment counts and revenue estimates across all courses</p>
                </div>

                {/* ── Summary KPI Cards ────────────────────────────────────── */}
                {!isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: 'Total Courses',      value: totals.courses,     icon: GraduationCap, color: 'text-blue-600',   bg: 'bg-blue-50',   fmt: (n: number) => n.toString() },
                            { label: 'Total Enrollments',  value: totals.enrollments, icon: Users,         color: 'text-purple-600', bg: 'bg-purple-50', fmt: (n: number) => n.toString() },
                            { label: 'Revenue (Est.)',      value: totals.revenue,     icon: Banknote,      color: 'text-emerald-600', bg: 'bg-emerald-50', fmt: formatEGP },
                        ].map((kpi) => {
                            const Icon = kpi.icon;
                            return (
                                <div key={kpi.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                                    <div className={`${kpi.bg} rounded-xl p-3`} aria-hidden="true">
                                        <Icon className={`h-6 w-6 ${kpi.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-0.5">{kpi.fmt(kpi.value)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Filters ─────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                        <label htmlFor="course-search" className="sr-only">Search courses</label>
                        <input
                            id="course-search"
                            type="search"
                            placeholder="Search by title or trainer…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        />
                    </div>

                    {/* Published filter */}
                    <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm" role="group" aria-label="Filter by publish status">
                        {(['all', 'published', 'draft'] as const).map((f) => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setPubFilter(f)}
                                className={`px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                    pubFilter === f
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Type filter */}
                    <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm" role="group" aria-label="Filter by course type">
                        {(['all', 'RECORDED', 'LIVE'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTypeFilter(t)}
                                className={`px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                    typeFilter === t
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {t === 'all' ? 'All Types' : t.charAt(0) + t.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    <p className="text-sm text-gray-500 self-center whitespace-nowrap">
                        {filtered.length} of {courses.length} courses
                    </p>
                </div>

                {/* ── Course Intelligence Table ─────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" aria-hidden="true" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-16 px-6">
                            <p className="text-red-600 font-medium">{error}</p>
                            <button
                                type="button"
                                onClick={fetchCourses}
                                className="mt-4 px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20">
                            <GraduationCap className="h-14 w-14 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                            <p className="font-semibold text-gray-600">No courses found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trainer</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Enrollments</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Rev. Est.</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((course) => (
                                        <tr key={course.courseId} className="hover:bg-gray-50/80 transition-colors">
                                            {/* Course title + thumbnail */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    {course.thumbnail ? (
                                                        <img
                                                            src={course.thumbnail}
                                                            alt=""
                                                            aria-hidden="true"
                                                            className="h-10 w-14 object-cover rounded-lg flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-14 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                                            <GraduationCap className="h-5 w-5 text-blue-400" />
                                                        </div>
                                                    )}
                                                    <p className="font-medium text-gray-900 line-clamp-2 max-w-[220px] leading-snug">
                                                        {course.title}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Trainer */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    {course.trainerAvatar ? (
                                                        <img
                                                            src={course.trainerAvatar}
                                                            alt=""
                                                            aria-hidden="true"
                                                            className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                                            <span className="text-xs font-bold text-gray-500">
                                                                {(course.trainerName ?? '?')[0].toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 truncate max-w-[130px]">
                                                            {course.trainerName ?? '—'}
                                                        </p>
                                                        {course.trainerSpecialization && (
                                                            <p className="text-xs text-gray-400 truncate max-w-[130px]">
                                                                {course.trainerSpecialization}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Type */}
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    course.courseType === 'LIVE'
                                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                }`}>
                                                    {course.courseType === 'LIVE'
                                                        ? <Radio className="h-3 w-3" aria-hidden="true" />
                                                        : <PlayCircle className="h-3 w-3" aria-hidden="true" />
                                                    }
                                                    {course.courseType === 'LIVE' ? 'Live' : 'Recorded'}
                                                </span>
                                            </td>

                                            {/* Published status */}
                                            <td className="px-5 py-4 text-center">
                                                {course.isPublished ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle className="h-3 w-3" aria-hidden="true" />
                                                        Published
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                        <XCircle className="h-3 w-3" aria-hidden="true" />
                                                        Draft
                                                    </span>
                                                )}
                                            </td>

                                            {/* Enrollments */}
                                            <td className="px-5 py-4 text-right">
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900">{course.liveEnrollmentCount}</p>
                                                    {course.paidEnrollments > 0 && (
                                                        <p className="text-xs text-emerald-600">
                                                            {course.paidEnrollments} paid
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Price */}
                                            <td className="px-5 py-4 text-right">
                                                {course.isFree ? (
                                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                                        Free
                                                    </span>
                                                ) : (
                                                    <span className="font-medium text-gray-900">
                                                        {formatEGP(course.price)}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Revenue estimate */}
                                            <td className="px-5 py-4 text-right">
                                                <span className={`font-bold ${course.revenueEstimate > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                                                    {course.revenueEstimate > 0 ? formatEGP(course.revenueEstimate) : '—'}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                                                {formatDate(course.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>

                                {/* Table footer: column totals */}
                                <tfoot className="bg-gray-50 border-t border-gray-200">
                                    <tr>
                                        <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                                            Visible Totals ({filtered.length} courses)
                                        </td>
                                        <td className="px-5 py-3 text-right text-xs font-bold text-gray-800">
                                            <TrendingUp className="h-3.5 w-3.5 text-purple-600 inline mr-1" aria-hidden="true" />
                                            {filtered.reduce((s, c) => s + c.liveEnrollmentCount, 0)}
                                        </td>
                                        <td className="px-5 py-3" />
                                        <td className="px-5 py-3 text-right text-xs font-bold text-emerald-700">
                                            {formatEGP(filtered.reduce((s, c) => s + c.revenueEstimate, 0))}
                                        </td>
                                        <td className="px-5 py-3" />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
