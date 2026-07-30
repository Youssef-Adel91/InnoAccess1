'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import {
    BookOpen,
    Award,
    TrendingUp,
    CheckCircle,
    Clock,
    ArrowRight,
    GraduationCap,
    Download,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type');
    if (!res.ok) {
        let errorMsg = `Failed to fetch data: status ${res.status} (${res.statusText})`;
        if (contentType && contentType.includes('text/html')) {
            errorMsg = `Received HTML (404/Redirect) instead of JSON: status ${res.status}`;
        }
        throw new Error(errorMsg);
    }
    if (contentType && contentType.includes('text/html')) {
        throw new Error('Received HTML instead of JSON. Check route matcher configuration.');
    }
    return res.json();
};

interface CourseProgressItem {
    _id: string;
    title: string;
    category: string;
    instructor: string;
    progressPercentage: number;
    completedVideosCount: number;
    totalVideos: number;
    enrolledAt?: string;
}

interface CertificateItem {
    id: string;
    title: string;
    issuedDate: string;
    issuer: string;
}

export default function StudentDashboardPage() {
    const t = useTranslations('Dashboard');
    const { user, isLoaded } = useUser();

    const userName = user?.firstName || user?.fullName || 'Student';

    // Fetch real dashboard stats from MongoDB via /api/user/dashboard
    const { data: dashboardResponse, error, isLoading } = useSWR(
        isLoaded && user ? '/api/user/dashboard' : null,
        fetcher
    );

    const dashboardData = dashboardResponse?.data;
    const enrolledCount = dashboardData?.enrolledCoursesCount ?? 0;
    const hoursLearned = dashboardData?.hoursLearned ?? 0;
    const completionRate = dashboardData?.completionRate ?? 0;
    const courses: CourseProgressItem[] = dashboardData?.courses ?? [];
    const certificates: CertificateItem[] = dashboardData?.certificates ?? [];

    const handleDownloadCertificate = (certName: string) => {
        console.log(`[Certificate] Downloading PDF for: ${certName}`);
        alert(`Certificate PDF download initiated for: ${certName}`);
    };

    return (
        <main
            id="main-content"
            className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 relative z-0"
        >
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Welcome Banner - Blue Accent Theme */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-6 sm:p-10 text-white shadow-lg shadow-blue-600/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold mb-3">
                            <GraduationCap className="w-4 h-4" />
                            <span>Student Account</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                            Welcome back, {userName}!
                        </h1>
                        <p className="mt-2 text-blue-100 max-w-xl text-sm sm:text-base">
                            Continue your accessible learning journey on InnoAccess. Track your progress, explore new courses, and earn industry-recognized certificates.
                        </p>
                    </div>
                    <Link
                        href="/courses"
                        className="px-6 py-3 rounded-xl bg-white text-blue-600 font-bold hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-95"
                    >
                        <span>Browse Courses</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Error Notice if fetch fails */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 flex items-center gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                        <span>{error.message || 'Failed to load dashboard data.'}</span>
                    </div>
                )}

                {/* Quick Stats / Learning Progress Overview */}
                <section aria-labelledby="stats-heading">
                    <h2
                        id="stats-heading"
                        className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"
                    >
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <span>Learning Progress</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-200 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Enrolled Courses</p>
                                <p className="text-3xl font-extrabold text-gray-900 mt-1">
                                    {isLoading ? (
                                        <Loader2 className="w-7 h-7 animate-spin text-blue-600 mt-1" />
                                    ) : (
                                        enrolledCount
                                    )}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                <BookOpen className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-200 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Hours Learned</p>
                                <p className="text-3xl font-extrabold text-gray-900 mt-1">
                                    {isLoading ? (
                                        <Loader2 className="w-7 h-7 animate-spin text-blue-600 mt-1" />
                                    ) : (
                                        `${hoursLearned} hrs`
                                    )}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-200 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                                <p className="text-3xl font-extrabold text-blue-600 mt-1">
                                    {isLoading ? (
                                        <Loader2 className="w-7 h-7 animate-spin text-blue-600 mt-1" />
                                    ) : (
                                        `${completionRate}%`
                                    )}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Content Grid: My Courses & Certificates */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* My Courses Section (2 columns) */}
                    <section aria-labelledby="courses-heading" className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2
                                id="courses-heading"
                                className="text-xl font-bold text-gray-900 flex items-center gap-2"
                            >
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                <span>My Courses</span>
                            </h2>
                            <Link
                                href="/student/courses"
                                className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                                View all
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 flex flex-col items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                                    <p className="text-sm text-gray-500">Loading your enrolled courses...</p>
                                </div>
                            ) : courses.length === 0 ? (
                                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 space-y-3">
                                    <BookOpen className="w-10 h-10 text-gray-400 mx-auto" />
                                    <h3 className="text-base font-semibold text-gray-800">
                                        No Courses Enrolled Yet
                                    </h3>
                                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                        Explore our catalog of web accessibility, inclusive UX, and assistive tech courses.
                                    </p>
                                    <Link
                                        href="/courses"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        <span>Browse Catalog</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            ) : (
                                courses.map((course) => (
                                    <Link
                                        key={course._id}
                                        href="/courses"
                                        className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                                                    {course.category}
                                                </span>
                                                <h3 className="text-lg font-bold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">
                                                    {course.title}
                                                </h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Instructor: {course.instructor}
                                                </p>
                                            </div>
                                            <span className="text-sm font-bold text-blue-600">
                                                {course.progressPercentage}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
                                            <div
                                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${course.progressPercentage}%` }}
                                            />
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Certificates Section (1 column) */}
                    <section aria-labelledby="certificates-heading" className="space-y-4">
                        <h2
                            id="certificates-heading"
                            className="text-xl font-bold text-gray-900 flex items-center gap-2"
                        >
                            <Award className="w-5 h-5 text-blue-600" />
                            <span>Certificates</span>
                        </h2>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                            {isLoading ? (
                                <div className="text-center py-6">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500">Loading certificates...</p>
                                </div>
                            ) : certificates.length === 0 ? (
                                <div className="text-center py-6 space-y-2">
                                    <Award className="w-8 h-8 text-gray-400 mx-auto" />
                                    <p className="text-sm font-medium text-gray-700">
                                        No Certificates Yet
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Complete any enrolled course to earn your verified accessibility certificate.
                                    </p>
                                </div>
                            ) : (
                                certificates.map((cert) => (
                                    <div
                                        key={cert.id}
                                        className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
                                    >
                                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                                            <Award className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">{cert.title}</h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Issued:{' '}
                                                {cert.issuedDate
                                                    ? new Date(cert.issuedDate).toLocaleDateString()
                                                    : 'InnoAccess Academy'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadCertificate(cert.title)}
                                                className="mt-3 px-3 py-1.5 rounded-lg bg-blue-50 text-xs font-semibold text-blue-600 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Download PDF</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
