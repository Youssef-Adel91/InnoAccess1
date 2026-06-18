'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
// ⚠️  Both useRouter AND usePathname must come from @/i18n/navigation (next-intl's
//     localized wrappers), NOT from next/navigation.
//     next-intl's usePathname strips the locale prefix so router.replace receives
//     the bare path (e.g. '/about') and prepends the new locale correctly.
import { useRouter, usePathname } from '@/i18n/navigation';
import {
    Briefcase,
    GraduationCap,
    Bell,
    User,
    LogOut,
    Menu,
    X,
    FileText,
    UserCheck,
    Video,
    Users,
    Languages,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ─── Language Switcher ────────────────────────────────────────────────────────

interface LanguageSwitcherProps {
    /** The currently active locale ('en' or 'ar') */
    currentLocale: string;
}

/**
 * LanguageSwitcher
 *
 * An accessible button that toggles between English (/en) and Arabic (/ar).
 * Uses next-intl's `useRouter` to navigate to the same page in the other locale
 * without a full page reload.
 *
 * Accessibility:
 *  - `lang` attribute on the button shows the OTHER language name in its own script
 *    (so a screen reader reading Arabic will pronounce "English" correctly).
 *  - `aria-label` is set in the current UI language for discoverability.
 *  - `aria-pressed` indicates the toggle state.
 */
function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
    const t = useTranslations('Header.languageSwitcher');
    const router = useRouter();
    const pathname = usePathname();

    const isAr = currentLocale === 'ar';
    const targetLocale = isAr ? 'en' : 'ar';

    const handleSwitch = () => {
        // next-intl's useRouter.replace preserves the current path while
        // switching the locale prefix (/en/... ↔ /ar/...).
        // We strip the locale prefix from pathname (next-intl gives us the
        // unlocalized path via its usePathname hook — if using next/navigation's
        // usePathname we'd need to strip manually).
        router.replace(pathname, { locale: targetLocale });
    };

    return (
        <button
            onClick={handleSwitch}
            // lang: the language of the LABEL TEXT (not the UI language)
            // so AT announces it correctly in the target language
            lang={targetLocale}
            aria-label={isAr ? t('ariaLabelToEn') : t('ariaLabelToAr')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 min-h-[44px] border border-gray-200"
        >
            <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{isAr ? t('switchToEnglish') : t('switchToArabic')}</span>
        </button>
    );
}

// ─── Main Header ──────────────────────────────────────────────────────────────

interface HeaderProps {
    /**
     * The active locale, passed down from the locale layout.
     * Falls back to 'en' if not provided (e.g. on non-locale pages).
     */
    locale?: string;
}

export function Header({ locale = 'en' }: HeaderProps) {
    const t = useTranslations('Header');
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
            { name: t('nav.jobs'),    href: `/${locale}/jobs`,    icon: Briefcase },
            { name: t('nav.courses'), href: `/${locale}/courses`,  icon: GraduationCap },
        ]
        : [
            { name: t('nav.aboutUs'),  href: `/${locale}/about`,    icon: Users },
            { name: t('nav.features'), href: `/${locale}/features`,  icon: GraduationCap },
            { name: t('nav.contact'),  href: `/${locale}/contact`,   icon: Bell },
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
                        href={`/${locale}`}
                        className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg px-1"
                        aria-label={t('logoLabel')}
                    >
                        <span dir="ltr" className="inline-block">
                            <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Inno</span>
                            <span className="text-2xl font-extrabold text-gray-900">Access</span>
                        </span>
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
                                {t('nav.myApplications')}
                                {pendingCount > 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white" aria-label={t('nav.pendingApplications', { count: pendingCount })}>
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        {session?.user?.role === 'user' && (
                            <Link href="/join-trainer" className={navLink('/join-trainer')} aria-current={isActive('/join-trainer') ? 'page' : undefined}>
                                <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                                {t('nav.becomeTrainer')}
                            </Link>
                        )}
                        {session?.user?.role === 'company' && (
                            <Link href="/company/jobs" className={navLink('/company/jobs')} aria-current={isActive('/company/jobs') ? 'page' : undefined}>
                                <Briefcase className="mr-2 h-4 w-4" aria-hidden="true" />
                                {t('nav.myJobs')}
                            </Link>
                        )}
                        {session?.user?.role === 'company' && (
                            <Link href="/company/courses" className={navLink('/company/courses')} aria-current={isActive('/company/courses') ? 'page' : undefined}>
                                <GraduationCap className="mr-2 h-4 w-4" aria-hidden="true" />
                                {t('nav.myCourses')}
                            </Link>
                        )}
                        {session?.user?.role === 'trainer' && (
                            <Link href="/trainer/dashboard" className={navLink('/trainer')} aria-current={isActive('/trainer') ? 'page' : undefined}>
                                <GraduationCap className="mr-2 h-4 w-4" aria-hidden="true" />
                                {t('nav.myCourses')}
                            </Link>
                        )}
                        {session?.user?.role === 'admin' && (
                            <>
                                <Link href="/admin/trainers/requests" className={navLink('/admin/trainers/requests')} aria-current={isActive('/admin/trainers/requests') ? 'page' : undefined}>
                                    <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                                    {t('nav.trainerRequests')}
                                </Link>
                                <Link href="/admin/approvals" className={navLink('/admin/approvals')} aria-current={isActive('/admin/approvals') ? 'page' : undefined}>
                                    <Video className="mr-2 h-4 w-4" aria-hidden="true" />
                                    {t('nav.videoApprovals')}
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-1">
                        {/* Language Switcher — always visible */}
                        <LanguageSwitcher currentLocale={locale} />

                        {status === 'loading' ? (
                            <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-200" aria-label={t('auth.loading')} />
                        ) : session ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="hidden sm:inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px]"
                                    aria-label={t('auth.dashboard')}
                                >
                                    <User className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                    {t('auth.dashboard')}
                                </Link>
                                <Link
                                    href="/notifications"
                                    className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px] min-w-[44px]"
                                    aria-label={
                                        unreadNotificationsCount > 0
                                            ? t('notifications.unreadLabel', { count: unreadNotificationsCount })
                                            : t('notifications.label')
                                    }
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
                                    onClick={() => signOut({ callbackUrl: `/${locale}` })}
                                    className="hidden sm:inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 min-h-[44px]"
                                    aria-label={t('auth.signOut')}
                                >
                                    <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                    <span className="hidden sm:inline">{t('auth.signOut')}</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href={`/${locale}/auth/signin`}
                                    className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px]"
                                >
                                    {t('auth.signIn')}
                                </Link>
                                <Link
                                    href={`/${locale}/auth/register`}
                                    className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 transition-all duration-200 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 min-h-[44px]"
                                >
                                    {t('auth.getStarted')}
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
                            aria-label={mobileMenuOpen ? t('mobile.close') : t('mobile.open')}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <nav id="mobile-menu" className="md:hidden border-t border-gray-100 py-3 space-y-1" aria-label="Mobile navigation">
                        <p className="sr-only" role="status" aria-live="polite">{t('mobile.menuOpen')}</p>

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
                                    {t('nav.myApplications')}
                                </span>
                                {pendingCount > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white" aria-label={t('nav.pendingApplications', { count: pendingCount })}>
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        {session?.user?.role === 'user' && (
                            <Link href="/join-trainer" className={mobileLink('/join-trainer')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/join-trainer') ? 'page' : undefined}>
                                <UserCheck className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                {t('nav.becomeTrainer')}
                            </Link>
                        )}
                        {session?.user?.role === 'company' && (
                            <Link href="/company/jobs" className={mobileLink('/company/jobs')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/company/jobs') ? 'page' : undefined}>
                                <Briefcase className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                {t('nav.myJobs')}
                            </Link>
                        )}
                        {session?.user?.role === 'company' && (
                            <Link href="/company/courses" className={mobileLink('/company/courses')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/company/courses') ? 'page' : undefined}>
                                <GraduationCap className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                {t('nav.myCourses')}
                            </Link>
                        )}
                        {session?.user?.role === 'trainer' && (
                            <Link href="/trainer/dashboard" className={mobileLink('/trainer')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/trainer') ? 'page' : undefined}>
                                <GraduationCap className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                {t('nav.myCourses')}
                            </Link>
                        )}
                        {session?.user?.role === 'admin' && (
                            <>
                                <Link href="/admin/trainers/requests" className={mobileLink('/admin/trainers/requests')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/admin/trainers/requests') ? 'page' : undefined}>
                                    <Users className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                    {t('nav.trainerRequests')}
                                </Link>
                                <Link href="/admin/approvals" className={mobileLink('/admin/approvals')} onClick={() => setMobileMenuOpen(false)} aria-current={isActive('/admin/approvals') ? 'page' : undefined}>
                                    <Video className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                                    {t('nav.videoApprovals')}
                                </Link>
                            </>
                        )}

                        {/* Mobile Auth Buttons */}
                        {!session && (
                            <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col gap-2 px-1">
                                <Link
                                    href={`/${locale}/auth/signin`}
                                    className="flex items-center justify-center w-full min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 border-2 border-gray-200 hover:bg-gray-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {t('auth.signIn')}
                                </Link>
                                <Link
                                    href={`/${locale}/auth/register`}
                                    className="flex items-center justify-center w-full min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {t('mobile.getStartedFree')}
                                </Link>
                            </div>
                        )}

                        {/* Mobile Dashboard / Sign Out */}
                        {session && (
                            <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col gap-2 px-1">
                                <Link
                                    href="/dashboard"
                                    className="flex items-center w-full min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                    onClick={() => setMobileMenuOpen(false)}
                                    aria-label={t('auth.dashboard')}
                                >
                                    <User className="h-5 w-5 mr-3 shrink-0" aria-hidden="true" />
                                    {t('auth.dashboard')}
                                </Link>
                                <button
                                    onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: `/${locale}` }); }}
                                    className="flex items-center w-full min-h-[44px] px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                                    aria-label={t('auth.signOut')}
                                >
                                    <LogOut className="h-5 w-5 mr-3 shrink-0" aria-hidden="true" />
                                    {t('auth.signOut')}
                                </button>
                            </div>
                        )}
                    </nav>
                )}
            </nav>
        </header>
    );
}
