'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Briefcase, GraduationCap, Bell, User, LogOut, Menu, X, FileText, UserCheck, Video, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Header() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const { data: notificationsData } = useSWR(
        session ? '/api/notifications?unreadOnly=true' : null,
        fetcher,
        { refreshInterval: 60000, revalidateOnFocus: true }
    );

    const unreadNotificationsCount = notificationsData?.data?.unreadCount || 0;

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

    useEffect(() => {
        if (session?.user?.role === 'user') fetchPendingCount();
    }, [session]);

    useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

    const fetchPendingCount = async () => {
        try {
            const response = await fetch('/api/user/applications?status=pending');
            const data = await response.json();
            if (data.success) setPendingCount(data.data.count || 0);
        } catch (error) {
            console.error('Failed to fetch pending count:', error);
        }
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    const navLink = (href: string) =>
        `inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
            isActive(href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
        }`;

    const mobileLink = (href: string) =>
        `flex items-center w-full px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            isActive(href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
        }`;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm supports-[backdrop-filter]:bg-white/80">
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg px-1"
                        aria-label="InnoAccess Home"
                    >
                        <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Inno</span>
                        <span className="text-2xl font-extrabold text-gray-900">Access</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex md:items-center md:space-x-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link key={item.name} href={item.href} className={navLink(item.href)} aria-current={isActive(item.href) ? 'page' : undefined}>
                                    <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                                    {item.name}
                                </Link>
                            );
                        })}
                        {session?.user?.role === 'user' && (
                            <Link href="/user/applications" className={navLink('/user/applications')} aria-current={isActive('/user/applications') ? 'page' : undefined}>
                                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                                My Applications
                                {pendingCount > 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white" aria-label={`${pendingCount} pending applications`}>
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        {session?.user?.role === 'user' && (
                            <Link href="/join-trainer" className={navLink('/join-trainer')} aria-current={isActive('/join-trainer') ? 'page' : undefined}>
                                <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                                Become a Trainer
                            </Link>
                        )}
                        {session?.user?.role === 'company' && (
                            <Link href="/company/jobs" className={navLink('/company/jobs')} aria-current={isActive('/company/jobs') ? 'page' : undefined}>
                                <Briefcase className="mr-2 h-4 w-4" aria-hidden="true" />
                                My Jobs
                            </Link>
                        )}
                        {session?.user?.role === 'company' && (
                            <Link href="/company/courses" className={navLink('/company/courses')} aria-current={isActive('/company/courses') ? 'page' : undefined}>
                                <GraduationCap className="mr-2 h-4 w-4" aria-hidden="true" />
                                My Courses
                            </Link>
                        )}
                        {session?.user?.role === 'trainer' && (
                            <Link href="/trainer/dashboard" className={navLink('/trainer')} aria-current={isActive('/trainer') ? 'page' : undefined}>
                                <GraduationCap className="mr-2 h-4 w-4" aria-hidden="true" />
                                My Courses
                            </Link>
                        )}
                        {session?.user?.role === 'admin' && (
                            <>
                                <Link href="/admin/trainers/requests" className={navLink('/admin/trainers/requests')} aria-current={isActive('/admin/trainers/requests') ? 'page' : undefined}>
                                    <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Trainer Requests
                                </Link>
                                <Link href="/admin/approvals" className={navLink('/admin/approvals')} aria-current={isActive('/admin/approvals') ? 'page' : undefined}>
                                    <Video className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Video Approvals
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-1">
                        {status === 'loading' ? (
                            <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-200" aria-label="Loading user session" />
                        ) : session ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="hidden sm:inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px]"
                                    aria-label="Dashboard"
                                >
                                    <User className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                    Dashboard
                                </Link>
                                <Link
                                    href="/notifications"
                                    className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px] min-w-[44px]"
                                    aria-label={unreadNotificationsCount > 0 ? `Notifications (${unreadNotificationsCount} unread)` : 'Notifications'}
                                >
                                    <div className="relative">
                                        <Bell className="h-5 w-5" aria-hidden="true" />
                                        {unreadNotificationsCount > 0 && (
                                            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold" aria-hidden="true">
                                                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    className="hidden sm:inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 min-h-[44px]"
                                    aria-label="Sign out"
                                >
                                    <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                    <span className="hidden sm:inline">Sign Out</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/auth/signin"
                                    className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px]"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 transition-all duration-200 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 min-h-[44px]"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}

                        {/* Mobile menu button */}
                        <button
                            id="mobile-menu-button"
                            className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-expanded={mobileMenuOpen}
                            aria-controls="mobile-menu"
                            aria-label={mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <nav id="mobile-menu" className="md:hidden border-t border-gray-100 py-3 space-y-1" aria-label="Mobile navigation">
                        <p className="sr-only" role="status" aria-live="polite">Mobile navigation menu open</p>

                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link key={item.name} href={item.href} className={mobileLink(item.href)} onClick={() => setMobileMenuOpen(false)} aria-current={isActive(item.href) ? 'page' : undefined}>
                                    <Icon className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                    {item.name}
                                </Link>
                            );
                        })}

                        {session?.user?.role === 'user' && (
                            <Link href="/user/applications" className={`${mobileLink('/user/applications')} justify-between`} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/user/applications') ? 'page' : undefined}>
                                <span className="flex items-center">
                                    <FileText className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                    My Applications
                                </span>
                                {pendingCount > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white" aria-label={`${pendingCount} pending applications`}>
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        {session?.user?.role === 'user' && (
                            <Link href="/join-trainer" className={mobileLink('/join-trainer')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/join-trainer') ? 'page' : undefined}>
                                <UserCheck className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                Become a Trainer
                            </Link>
                        )}
                        {session?.user?.role === 'company' && (
                            <Link href="/company/jobs" className={mobileLink('/company/jobs')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/company/jobs') ? 'page' : undefined}>
                                <Briefcase className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                My Jobs
                            </Link>
                        )}
                        {session?.user?.role === 'company' && (
                            <Link href="/company/courses" className={mobileLink('/company/courses')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/company/courses') ? 'page' : undefined}>
                                <GraduationCap className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                My Courses
                            </Link>
                        )}
                        {session?.user?.role === 'trainer' && (
                            <Link href="/trainer/dashboard" className={mobileLink('/trainer')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/trainer') ? 'page' : undefined}>
                                <GraduationCap className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                My Courses
                            </Link>
                        )}
                        {session?.user?.role === 'admin' && (
                            <>
                                <Link href="/admin/trainers/requests" className={mobileLink('/admin/trainers/requests')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/admin/trainers/requests') ? 'page' : undefined}>
                                    <Users className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                    Trainer Requests
                                </Link>
                                <Link href="/admin/approvals" className={mobileLink('/admin/approvals')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/admin/approvals') ? 'page' : undefined}>
                                    <Video className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                    Video Approvals
                                </Link>
                            </>
                        )}

                        {/* Mobile Auth Buttons */}
                        {!session && (
                            <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col gap-2 px-1">
                                <Link
                                    href="/auth/signin"
                                    className="flex items-center justify-center w-full min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 border-2 border-gray-200 hover:bg-gray-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="flex items-center justify-center w-full min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Get Started — It&apos;s Free
                                </Link>
                            </div>
                        )}

                        {/* Mobile Dashboard / Sign Out for authenticated users */}
                        {session && (
                            <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col gap-2 px-1">
                                <Link
                                    href="/dashboard"
                                    className="flex items-center w-full min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                    onClick={() => setMobileMenuOpen(false)}
                                    aria-label="Dashboard"
                                >
                                    <User className="h-5 w-5 mr-3 shrink-0" aria-hidden="true" />
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                                    className="flex items-center w-full min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                                    aria-label="Sign out"
                                >
                                    <LogOut className="h-5 w-5 mr-3 shrink-0" aria-hidden="true" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </nav>
                )}
            </nav>
        </header>
    );
}
