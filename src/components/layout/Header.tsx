'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Briefcase, GraduationCap, Bell, User, LogOut, Settings, Menu } from 'lucide-react';
import { useState } from 'react';

export function Header() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navigation = [
        { name: 'Jobs', href: '/jobs', icon: Briefcase },
        { name: 'Courses', href: '/courses', icon: GraduationCap },
    ];

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
                                    aria-label="Notifications"
                                >
                                    <Bell className="h-4 w-4" aria-hidden="true" />
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
                    </div>
                )}
            </nav>
        </header>
    );
}
