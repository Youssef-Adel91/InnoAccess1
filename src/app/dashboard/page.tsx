'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, GraduationCap, Bell, Settings, User as UserIcon } from 'lucide-react';

export default function DashboardPage() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return (
            <main id="main-content" className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your dashboard...</p>
                </div>
            </main>
        );
    }

    if (status === 'unauthenticated') {
        redirect('/auth/signin');
    }

    // Redirect admins to admin dashboard
    if (session?.user?.role === 'admin') {
        redirect('/admin');
    }

    const quickActions = [
        {
            name: 'Browse Jobs',
            href: '/jobs',
            icon: Briefcase,
            description: 'Find your next opportunity',
            color: 'bg-blue-500',
        },
        {
            name: 'Browse Courses',
            href: '/courses',
            icon: GraduationCap,
            description: 'Continue learning',
            color: 'bg-green-500',
        },
        {
            name: 'Notifications',
            href: '/notifications',
            icon: Bell,
            description: 'View updates',
            color: 'bg-yellow-500',
        },
        {
            name: 'My Profile',
            href: '/profile',
            icon: Settings,
            description: 'Edit your information',
            color: 'bg-gray-500',
        },
    ];

    return (
        <main id="main-content" className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome back, {session?.user?.name}!
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Role: <span className="font-medium capitalize">{session?.user?.role}</span>
                    </p>
                </div>

                {/* Company Pending Approval */}
                {session?.user?.role === 'company' && !session?.user?.isApproved && (
                    <div
                        className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4"
                        role="alert"
                        aria-live="polite"
                    >
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-5 w-5 text-yellow-400"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 013l6.28 10.875c.673 1.168-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.457-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    Your company account is pending admin approval. You&apos;ll be able to post jobs once
                                    approved.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {quickActions
                            .filter((action) => {
                                // Hide admin panel from non-admin users
                                if (action.href === '/admin' && session?.user?.role !== 'admin') {
                                    return false;
                                }
                                return true;
                            })
                            .map((action) => {
                                const Icon = action.icon;
                                return (
                                    <Link
                                        key={action.name}
                                        href={action.href}
                                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                    >
                                        <div className={`inline-flex p-3 rounded-lg ${action.color} text-white mb-4`}>
                                            <Icon className="h-6 w-6" aria-hidden="true" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">{action.name}</h3>
                                        <p className="mt-1 text-sm text-gray-600">{action.description}</p>
                                    </Link>
                                );
                            })}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Briefcase className="h-8 w-8 text-blue-600" aria-hidden="true" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Applications</p>
                                <p className="text-2xl font-bold text-gray-900">0</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <GraduationCap className="h-8 w-8 text-green-600" aria-hidden="true" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Enrolled Courses</p>
                                <p className="text-2xl font-bold text-gray-900">0</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <UserIcon className="h-8 w-8 text-purple-600" aria-hidden="true" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Profile Views</p>
                                <p className="text-2xl font-bold text-gray-900">0</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
