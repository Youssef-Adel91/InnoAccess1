'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, GraduationCap, Bell, Settings, User as UserIcon, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import useSWR from 'swr';
import { ProfileCompletenessCard } from '@/components/dashboard/ProfileCompletenessCard';
import { LiveSessionAlert } from '@/components/dashboard/LiveSessionAlert';
import { calculateProfileCompleteness } from '@/lib/profileCompleteness';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
    const { data: session, status } = useSession();

    // Fetch user applications
    const { data: applicationsData } = useSWR(
        session?.user?.role === 'user' ? '/api/user/applications' : null,
        fetcher
    );

    // Fetch user enrollments
    const { data: enrollmentsData } = useSWR(
        session?.user?.role === 'user' ? '/api/user/enrollments' : null,
        fetcher
    );

    // Fetch recent notifications
    const { data: notificationsData } = useSWR(
        session ? '/api/notifications?limit=3' : null,
        fetcher
    );

    // Fetch full user profile for completeness calculation
    const { data: userProfileData } = useSWR(
        session?.user?.role === 'user' ? '/api/user/profile' : null,
        fetcher
    );

    // Fetch upcoming live sessions (within 24 hours)
    const { data: upcomingSessionsData } = useSWR(
        session?.user?.role === 'user' ? '/api/user/upcoming-sessions' : null,
        fetcher,
        { refreshInterval: 30000 } // Refresh every 30 seconds for live updates
    );

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

    // Calculate stats
    const applicationsCount = applicationsData?.data?.applications?.length || 0;
    const enrollmentsCount = enrollmentsData?.data?.enrollments?.length || 0;
    const recentApplications = applicationsData?.data?.applications?.slice(0, 3) || [];
    const latestNotification = notificationsData?.data?.notifications?.[0];

    // Calculate profile completeness (only for regular users)
    const profileCompleteness = session?.user?.role === 'user' && userProfileData?.data?.user
        ? calculateProfileCompleteness(userProfileData.data.user)
        : null;

    // Get upcoming live sessions
    const upcomingSessions = upcomingSessionsData?.data?.sessions || [];

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
            name: 'My Courses',
            href: '/user/courses',
            icon: GraduationCap,
            description: 'View enrolled courses',
            color: 'bg-purple-500',
            userOnly: true, // Only show for users
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
                                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.168-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.457-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
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

                {/* Live Workshop Alerts - Only for users */}
                {upcomingSessions.length > 0 && (
                    <div className="mb-8">
                        {upcomingSessions.map((session: any) => (
                            <div key={session._id} className="mb-4">
                                <LiveSessionAlert course={session} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Profile Completeness - Only for users */}
                {profileCompleteness && profileCompleteness.percentage < 100 && (
                    <div className="mb-8">
                        <ProfileCompletenessCard completeness={profileCompleteness} />
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Briefcase className="h-8 w-8 text-blue-600" aria-hidden="true" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Applications</p>
                                <p className="text-2xl font-bold text-gray-900">{applicationsCount}</p>
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
                                <p className="text-2xl font-bold text-gray-900">{enrollmentsCount}</p>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Recent Applications Widget */}
                    {session?.user?.role === 'user' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
                                <Link
                                    href="/user/applications"
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                                >
                                    View all
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </Link>
                            </div>
                            {recentApplications.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">
                                    No applications yet. <Link href="/jobs" className="text-blue-600 hover:underline">Browse jobs</Link>
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {recentApplications.map((app: any) => (
                                        <div key={app._id} className="border-l-4 border-blue-500 pl-4 py-2">
                                            <Link
                                                href={`/jobs/${app.jobId._id}`}
                                                className="font-medium text-gray-900 hover:text-blue-600"
                                            >
                                                {app.jobId.title}
                                            </Link>
                                            <p className="text-sm text-gray-600">{app.jobId.companyId.name}</p>
                                            <div className="flex items-center mt-1 text-xs text-gray-500">
                                                {app.status === 'pending' && <Clock className="h-3 w-3 mr-1 text-yellow-500" />}
                                                {app.status === 'viewed' && <CheckCircle className="h-3 w-3 mr-1 text-blue-500" />}
                                                <span className="capitalize">{app.status}</span>
                                                <span className="mx-2">•</span>
                                                <span>{new Date(app.appliedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Latest Notification Widget */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Latest Notification</h2>
                            <Link
                                href="/notifications"
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                            >
                                View all
                                <ArrowRight className="h-4 w-4 ml-1" />
                            </Link>
                        </div>
                        {!latestNotification ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No notifications yet. We&apos;ll notify you of important updates!
                            </p>
                        ) : (
                            <div className="border-l-4 border-yellow-500 pl-4 py-2">
                                <h3 className="font-medium text-gray-900">{latestNotification.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{latestNotification.message}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    {new Date(latestNotification.createdAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {quickActions
                            .filter((action) => {
                                // Hide admin panel from non-admin users
                                if (action.href === '/admin' && session?.user?.role !== 'admin') {
                                    return false;
                                }
                                // Filter out user-only actions if not a regular user
                                if (action.userOnly && session?.user?.role !== 'user') {
                                    return false;
                                }
                                return true;
                            })
                            .map((action) => (
                                <Link
                                    key={action.name}
                                    href={action.href}
                                    className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center">
                                        <div className={`${action.color} p-3 rounded-lg`}>
                                            <action.icon className="h-6 w-6 text-white" aria-hidden="true" />
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="text-sm font-semibold text-gray-900">{action.name}</h3>
                                            <p className="text-xs text-gray-600">{action.description}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
