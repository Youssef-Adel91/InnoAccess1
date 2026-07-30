'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import {
    Award,
    Users,
    DollarSign,
    BookOpen,
    PlusCircle,
    ArrowRight,
    TrendingUp,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default function TrainerDashboardPage() {
    const t = useTranslations('Dashboard');
    const { user } = useUser();

    const userName = user?.firstName || user?.fullName || 'Trainer';

    return (
        <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Welcome Banner - Purple Accent Theme */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-3xl p-6 sm:p-10 text-white shadow-lg shadow-purple-600/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/30 text-purple-100 text-xs font-semibold mb-3">
                            <Award className="w-4 h-4" />
                            <span>Trainer Account</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                            Welcome back, {userName}!
                        </h1>
                        <p className="mt-2 text-purple-100 max-w-xl text-sm sm:text-base">
                            Empower inclusive learning on InnoAccess. Manage your courses, track student engagement, and review your revenue in real-time.
                        </p>
                    </div>
                    <Link
                        href="/trainer/courses"
                        className="px-6 py-3 rounded-xl bg-white text-purple-700 font-bold hover:bg-purple-50 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Create New Course</span>
                    </Link>
                </div>

                {/* Trainer KPI Metrics: Total Students, Revenue, Published Courses */}
                <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        <span>Trainer Performance</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Students</p>
                                <p className="text-3xl font-extrabold text-gray-900 mt-1">342</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                                <p className="text-3xl font-extrabold text-purple-600 mt-1">$4,850</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                                <DollarSign className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Published Courses</p>
                                <p className="text-3xl font-extrabold text-gray-900 mt-1">3</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                                <BookOpen className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Section: My Published Courses & Revenue Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Published Courses (2 columns) */}
                    <section className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-purple-600" />
                                <span>My Published Courses</span>
                            </h2>
                            <Link href="/trainer/courses" className="text-sm font-semibold text-purple-600 hover:underline">
                                Manage all
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {/* Course 1 */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-purple-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">
                                        Active
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 mt-2">
                                        Accessible React & Next.js UI Masterclass
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        184 enrolled students • 4.9 ★★★★★
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Revenue</p>
                                        <p className="text-lg font-bold text-gray-900">$2,420</p>
                                    </div>
                                    <Link
                                        href="/trainer/courses"
                                        className="p-2 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-300 text-purple-600 transition-colors"
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </div>
                            </div>

                            {/* Course 2 */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-purple-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">
                                        Active
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 mt-2">
                                        WCAG Compliance for Modern Developers
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        158 enrolled students • 4.8 ★★★★★
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Revenue</p>
                                        <p className="text-lg font-bold text-gray-900">$2,430</p>
                                    </div>
                                    <Link
                                        href="/trainer/courses"
                                        className="p-2 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-300 text-purple-600 transition-colors"
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Revenue Sidebar Section (1 column) */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                            <span>Revenue</span>
                        </h2>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Current Balance
                                </p>
                                <p className="text-3xl font-extrabold text-purple-600 mt-1">
                                    $1,240.00
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Available for payout on the 1st of next month
                                </p>
                            </div>

                            <hr className="border-gray-100" />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Lifetime Earnings</span>
                                    <span className="font-bold text-gray-900">$4,850.00</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Platform Fee (10%)</span>
                                    <span className="font-bold text-gray-500">-$485.00</span>
                                </div>
                            </div>

                            <Link
                                href="/trainer/finance"
                                className="w-full block text-center py-3 rounded-xl bg-purple-600 hover:bg-purple-700 font-bold text-white transition-colors shadow-md shadow-purple-600/20"
                            >
                                View Finance Ledger
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
