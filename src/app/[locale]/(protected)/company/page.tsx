'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import {
    Building2,
    Briefcase,
    Award,
    Users,
    PlusCircle,
    ArrowRight,
    TrendingUp,
    CheckCircle2,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default function CompanyDashboardPage() {
    const t = useTranslations('Dashboard');
    const { user } = useUser();

    const companyName = user?.firstName || user?.fullName || 'Employer';

    return (
        <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Welcome Banner - Amber/Orange Accent Theme */}
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-3xl p-6 sm:p-10 text-white shadow-lg shadow-amber-600/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/30 text-amber-100 text-xs font-semibold mb-3">
                            <Building2 className="w-4 h-4" />
                            <span>Company & Employer Portal</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                            Welcome, {companyName}!
                        </h1>
                        <p className="mt-2 text-amber-100 max-w-xl text-sm sm:text-base">
                            Connect with skilled accessible talent on InnoAccess. Manage your active job postings, sponsor inclusive learning initiatives, and hire top graduates.
                        </p>
                    </div>
                    <Link
                        href="/company/jobs"
                        className="px-6 py-3 rounded-xl bg-white text-amber-700 font-bold hover:bg-amber-50 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Post New Job</span>
                    </Link>
                </div>

                {/* Company KPI Metrics: Active Job Postings, Sponsored Courses, Hired Talents */}
                <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                        <span>Employer Overview</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Active Job Postings</p>
                                <p className="text-3xl font-extrabold text-gray-900 mt-1">4</p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                                <Briefcase className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Sponsored Courses</p>
                                <p className="text-3xl font-extrabold text-amber-600 mt-1">2</p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                                <Award className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Hired Talents</p>
                                <p className="text-3xl font-extrabold text-gray-900 mt-1">8</p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Section: Active Job Postings & Sponsored Courses */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Active Job Postings (2 columns) */}
                    <section className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-amber-600" />
                                <span>Active Job Postings</span>
                            </h2>
                            <Link href="/company/jobs" className="text-sm font-semibold text-amber-600 hover:underline">
                                View all
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {/* Job Item 1 */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-amber-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                                        Remote / Accessible
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 mt-2">
                                        Accessibility QA Engineer (WCAG Specialist)
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        14 applicants • Posted 3 days ago
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Active</span>
                                    </span>
                                    <Link
                                        href="/company/jobs"
                                        className="p-2 rounded-xl border border-gray-200 hover:bg-amber-50 hover:border-amber-300 text-amber-600 transition-colors"
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </div>
                            </div>

                            {/* Job Item 2 */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-amber-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                                        Hybrid / Engineering
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 mt-2">
                                        Senior Frontend Engineer (React/A11y)
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        26 applicants • Posted 1 week ago
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Active</span>
                                    </span>
                                    <Link
                                        href="/company/jobs"
                                        className="p-2 rounded-xl border border-gray-200 hover:bg-amber-50 hover:border-amber-300 text-amber-600 transition-colors"
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Sponsored Courses Section (1 column) */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-600" />
                            <span>Sponsored Courses</span>
                        </h2>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">
                                        WCAG 2.2 Corporate Scholarship Fund
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        50 sponsored seats • 38 enrolled learners
                                    </p>
                                    <Link
                                        href="/company/courses"
                                        className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                                    >
                                        <span>Manage Sponsorships</span>
                                        <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">
                                        Hired Talents Pool
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        8 graduates hired from InnoAccess Academy
                                    </p>
                                    <Link
                                        href="/company/jobs"
                                        className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                                    >
                                        <span>View Hired Profiles</span>
                                        <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
