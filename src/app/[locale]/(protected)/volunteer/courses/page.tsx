'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession }   from 'next-auth/react';
import { redirect }     from 'next/navigation';
import Link             from 'next/link';
import { GraduationCap, Search, LayoutGrid, Wallet } from 'lucide-react';
import AffiliateCourseCard, { type AffiliateCourse } from '@/components/volunteer/AffiliateCourseCard';

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function VolunteerCoursesPage() {
    const { data: session, status } = useSession();

    const [courses,       setCourses]       = useState<AffiliateCourse[]>([]);
    const [affiliateCode, setAffiliateCode] = useState<string>('');
    const [searchQuery,   setSearchQuery]   = useState<string>('');
    const [isLoading,     setIsLoading]     = useState(true);
    const [error,         setError]         = useState<string | null>(null);

    // ── Fetch affiliate code (lazy generation) ────────────────────────────────
    const fetchAffiliateCode = useCallback(async () => {
        try {
            const res  = await fetch('/api/volunteer/affiliate-code');
            const data = await res.json();
            if (data.success) {
                setAffiliateCode(data.data.affiliateCode);
            }
        } catch {
            console.error('Failed to fetch affiliate code');
        }
    }, []);

    // ── Fetch published courses ───────────────────────────────────────────────
    const fetchCourses = useCallback(async () => {
        try {
            setIsLoading(true);
            const res  = await fetch('/api/courses?limit=100');
            const data = await res.json();
            if (data.success) {
                setCourses(data.data.courses);
            } else {
                setError('Failed to load courses');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.user?.role === 'volunteer') {
            fetchAffiliateCode();
            fetchCourses();
        }
    }, [session, fetchAffiliateCode, fetchCourses]);

    // ── Auth guards ───────────────────────────────────────────────────────────
    if (status === 'loading') {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" aria-hidden="true" />
                    <p className="mt-4 text-gray-600">Loading…</p>
                </div>
            </main>
        );
    }

    if (status === 'unauthenticated' || session?.user?.role !== 'volunteer') {
        redirect('/dashboard');
    }

    // ── Filter ────────────────────────────────────────────────────────────────
    const filteredCourses = courses.filter((course) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                {/* ── Page Header ─────────────────────────────────────────── */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Share Courses & Earn</h1>
                        <p className="mt-1 text-gray-600">
                            Copy any course link — earn <strong>10%</strong> commission on every sale through your link.
                        </p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                        <Link
                            href="/volunteer/affiliate"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <Wallet className="h-4 w-4" aria-hidden="true" />
                            My Wallet
                        </Link>
                    </div>
                </div>

                {/* ── Affiliate Code Banner ────────────────────────────────── */}
                {affiliateCode && (
                    <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-blue-200">Your Affiliate Code</p>
                                <p className="text-2xl font-bold tracking-widest mt-0.5">{affiliateCode}</p>
                            </div>
                            <p className="text-sm text-blue-100 max-w-xs">
                                This code is embedded automatically in every link you copy below.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Search ──────────────────────────────────────────────── */}
                <div className="mb-6 relative">
                    <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
                        aria-hidden="true"
                    />
                    <label htmlFor="course-search" className="sr-only">Search courses</label>
                    <input
                        id="course-search"
                        type="search"
                        placeholder="Search courses by name or description…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                </div>

                {/* ── Stats Bar ───────────────────────────────────────────── */}
                {!isLoading && !error && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                        <span>
                            Showing <strong>{filteredCourses.length}</strong> of <strong>{courses.length}</strong> courses
                        </span>
                    </div>
                )}

                {/* ── Content ─────────────────────────────────────────────── */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl border border-gray-200 h-72 animate-pulse"
                                aria-hidden="true"
                            />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-red-200">
                        <p className="text-red-600 font-medium">{error}</p>
                        <button
                            type="button"
                            onClick={fetchCourses}
                            className="mt-4 px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                        <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">No courses found</h3>
                        <p className="text-gray-500">
                            {searchQuery ? `No courses match "${searchQuery}"` : 'No courses are published yet.'}
                        </p>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="mt-4 text-sm text-blue-600 hover:underline"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredCourses.map((course) => (
                            affiliateCode ? (
                                <AffiliateCourseCard
                                    key={course._id}
                                    course={course}
                                    affiliateCode={affiliateCode}
                                />
                            ) : (
                                // Skeleton while affiliate code loads
                                <div
                                    key={course._id}
                                    className="bg-white rounded-2xl border border-gray-200 h-72 animate-pulse"
                                    aria-hidden="true"
                                />
                            )
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
