'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Briefcase, GraduationCap, Bell, User, LogOut, Settings, Menu, FileText, UserCheck, Video, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import useSWR from 'swr';

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Header() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    // Fetch unread notifications count with SWR (polls every 60 seconds)
    const { data: notificationsData } = useSWR(
        session ? '/api/notifications?unreadOnly=true' : null,
        fetcher,
        {
            refreshInterval: 60000, // Poll every 60 seconds
            revalidateOnFocus: true, // Refresh when user returns to tab
        }
    );

    const unreadNotificationsCount = notificationsData?.data?.unreadCount || 0;

    // Dynamic navigation based on authentication status
    const navigation = session
        ? [
            { name: 'Jobs', href: '/jobs', icon: Briefcase },
            { name: 'Courses', href: '/courses', icon: GraduationCap },
        ]
        : [
            { name: 'About Us', href: '/about', icon: Users },
            { name: 'Features', href: '/features', icon: GraduationCap },
            { name: 'Contact', href: '/contact', icon: Bell },
        ];

    // Fetch pending applications count for users
    useEffect(() => {
        if (session?.user?.role === 'user') {
            fetchPendingCount();
        }
    }, [session]);

    const fetchPendingCount = async () => {
        try {
            const response = await fetch('/api/user/applications?status=pending');
            const data = await response.json();
            if (data.success) {
                setPendingCount(data.data.count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch pending count:', error);
        }
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link
                            href="/"
                            className="flex items-center space-x-2 text-xl font-bold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-2"
                            aria-label="InnoAccess Home"
                        >
                            <span className="text-blue-600">Inno</span>
                            <span>Access</span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex md:items-center md:space-x-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${isActive(item.href)
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    aria-current={isActive(item.href) ? 'page' : undefined}
                                >
                                    <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                                    {item.name}
                                </Link>
                            );
                        })}

                        {/* My Applications - Only for users */}
                        {session?.user?.role === 'user' && (
                            <Link
                                href="/user/applications"
                                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${isActive('/user/applications')
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                aria-current={isActive('/user/applications') ? 'page' : undefined}
                            >
                                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                                My Applications
                                {pendingCount > 0 && (
                                    <span
                                        className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white"
                                        aria-label={`${pendingCount} pending applications`}
                                    >
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        {/* Become a Trainer - Only for users */}
                        {session?.user?.role === 'user' && (
                            <Link
                                href="/join-trainer"
                                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${isActive('/join-trainer')
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                aria-current={isActive('/join-trainer') ? 'page' : undefined}
                            >
                                <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                                Become a Trainer
                            </Link>
                        )}

                        {/* My Jobs - Only for companies */}
                        {session?.user?.role === 'company' && (
                            <Link
                                href="/company/jobs"
                                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${isActive('/company/jobs')
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                aria-current={isActive('/company/jobs') ? 'page' : undefined}
                            >
                                <Briefcase className="mr-2 h-4 w-4" aria-hidden="true" />
                                My Jobs
                            </Link>
                        )}

                        {/* My Courses - Only for trainers */}
                        {session?.user?.role === 'trainer' && (
                            <Link
                                href="/trainer/dashboard"
                                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${isActive('/trainer')
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                aria-current={isActive('/trainer') ? 'page' : undefined}
                            >
                                <GraduationCap className="mr-2 h-4 w-4" aria-hidden="true" />
                                My Courses
                            </Link>
                        )}

                        {/* Admin Approvals - Only for admins */}
                        {session?.user?.role === 'admin' && (
                            <>
                                <Link
                                    href="/admin/trainers/requests"
                                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${isActive('/admin/trainers/requests')
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    aria-current={isActive('/admin/trainers/requests') ? 'page' : undefined}
                                >
                                    <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Trainer Requests
                                </Link>
                                <Link
                                    href="/admin/approvals"
                                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${isActive('/admin/approvals')
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    aria-current={isActive('/admin/approvals') ? 'page' : undefined}
                                >
                                    <Video className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Video Approvals
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center space-x-2">
                        {status === 'loading' ? (
                            <div className="h-8 w-20 animate-pulse rounded bg-gray-200" aria-label="Loading user session" />
                        ) : session ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                    aria-label="Dashboard"
                                >
                                    <User className="h-4 w-4 mr-2" aria-hidden="true" />
                                    <span className="hidden sm:inline">Dashboard</span>
                                </Link>
                                <Link
                                    href="/notifications"
                                    className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                    aria-label={unreadNotificationsCount > 0 ? `Notifications (${unreadNotificationsCount} unread)` : 'Notifications'}
                                >
                                    <div className="relative">
                                        <Bell className="h-4 w-4" aria-hidden="true" />
                                        {unreadNotificationsCount > 0 && (
                                            <span
                                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold"
                                                aria-hidden="true"
                                            >
                                                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                                    aria-label="Sign out"
                                >
                                    <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                                    <span className="hidden sm:inline">Sign Out</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/auth/signin"
                                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}

                        {/* Mobile menu button */}
                        <button
                            className="md:hidden inline-flex items-center px-2 py-2 rounded-md text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-expanded={mobileMenuOpen}
                            aria-label="Toggle mobile menu"
                        >
                            <Menu className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t py-4 space-y-2" role="menu">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center px-4 py-2 rounded-md text-base font-medium transition-colors ${isActive(item.href)
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                    role="menuitem"
                                >
                                    <Icon className="mr-3 h-5 w-5" aria-hidden="true" />
                                    {item.name}
                                </Link>
                            );
                        })}

                        {/* My Applications - Only for users */}
                        {session?.user?.role === 'user' && (
                            <Link
                                href="/user/applications"
                                className={`flex items-center justify-between px-4 py-2 rounded-md text-base font-medium transition-colors ${isActive('/user/applications')
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                onClick={() => setMobileMenuOpen(false)}
                                role="menuitem"
                            >
                                <span className="flex items-center">
                                    <FileText className="mr-3 h-5 w-5" aria-hidden="true" />
                                    My Applications
                                </span>
                                {pendingCount > 0 && (
                                    <span
                                        className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white"
                                        aria-label={`${pendingCount} pending applications`}
                                    >
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        {/* Become a Trainer - Only for users (Mobile) */}
                        {session?.user?.role === 'user' && (
                            <Link
                                href="/join-trainer"
                                className={`flex items-center px-4 py-2 rounded-md text-base font-medium transition-colors ${isActive('/join-trainer')
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                onClick={() => setMobileMenuOpen(false)}
                                role="menuitem"
                            >
                                <UserCheck className="mr-3 h-5 w-5" aria-hidden="true" />
                                Become a Trainer
                            </Link>
                        )}

                        {/* My Jobs - Only for companies */}
                        {session?.user?.role === 'company' && (
                            <Link
                                href="/company/jobs"
                                className={`flex items-center px-4 py-2 rounded-md text-base font-medium transition-colors ${isActive('/company/jobs')
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                onClick={() => setMobileMenuOpen(false)}
                                role="menuitem"
                            >
                                <Briefcase className="mr-3 h-5 w-5" aria-hidden="true" />
                                My Jobs
                            </Link>
                        )}

                        {/* My Courses - Only for trainers (Mobile) */}
                        {session?.user?.role === 'trainer' && (
                            <Link
                                href="/trainer/dashboard"
                                className={`flex items-center px-4 py-2 rounded-md text-base font-medium transition-colors ${isActive('/trainer')
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                onClick={() => setMobileMenuOpen(false)}
                                role="menuitem"
                            >
                                <GraduationCap className="mr-3 h-5 w-5" aria-hidden="true" />
                                My Courses
                            </Link>
                        )}

                        {/* Admin Approvals - Only for admins (Mobile) */}
                        {session?.user?.role === 'admin' && (
                            <>
                                <Link
                                    href="/admin/trainers/requests"
                                    className={`flex items-center px-4 py-2 rounded-md text-base font-medium transition-colors ${isActive('/admin/trainers/requests')
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                    role="menuitem"
                                >
                                    <Users className="mr-3 h-5 w-5" aria-hidden="true" />
                                    Trainer Requests
                                </Link>
                                <Link
                                    href="/admin/approvals"
                                    className={`flex items-center px-4 py-2 rounded-md text-base font-medium transition-colors ${isActive('/admin/approvals')
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                    role="menuitem"
                                >
                                    <Video className="mr-3 h-5 w-5" aria-hidden="true" />
                                    Video Approvals
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </nav>
        </header>
    );
}
