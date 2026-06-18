'use client';

import Link from 'next/link';
import { Facebook, Linkedin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SOCIAL_LINKS } from '@/lib/constants';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
);

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
);

interface FooterProps {
    /** Active locale — used to build locale-prefixed hrefs */
    locale?: string;
}

export function Footer({ locale = 'en' }: FooterProps) {
    const t = useTranslations('Footer');

    const navigation = {
        platform: [
            { name: t('links.findJobs'),           href: `/${locale}/jobs` },
            { name: t('links.browseCourses'),       href: `/${locale}/courses` },
            { name: t('links.postJob'),             href: '/company/jobs/new' },
            { name: t('links.teachOnInnoAccess'),   href: '/join-trainer' },
        ],
        company: [
            { name: t('links.aboutUs'), href: `/${locale}/about` },
            { name: t('links.contact'),  href: `/${locale}/contact` },
        ],
        legal: [] as { name: string; href: string }[],
    };

    const social = [
        { name: 'Facebook', href: SOCIAL_LINKS.facebook, icon: Facebook },
        { name: 'LinkedIn', href: SOCIAL_LINKS.linkedin, icon: Linkedin },
        { name: 'WhatsApp', href: SOCIAL_LINKS.whatsapp, icon: WhatsAppIcon },
        { name: 'TikTok', href: SOCIAL_LINKS.tiktok, icon: TikTokIcon },
    ];

    return (
        <footer className="bg-gray-950 text-gray-400" aria-labelledby="footer-heading">
            <h2 id="footer-heading" className="sr-only">{t('heading')}</h2>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 sm:gap-8">
                    {/* Brand */}
                    <div className="sm:col-span-2 md:col-span-1">
                        <Link
                            href={`/${locale}`}
                            className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                            aria-label={t('logoLabel')}
                        >
                            <span dir="ltr" className="inline-block">
                                <span className="text-xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Inno</span>
                                <span className="text-xl font-extrabold text-white">Access</span>
                            </span>
                        </Link>
                        <p className="mt-3 text-sm text-gray-400 leading-relaxed max-w-xs">
                            {t('tagline')}
                        </p>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h3 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
                            {t('sections.platform')}
                        </h3>
                        <ul className="space-y-3">
                            {navigation.platform.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
                            {t('sections.company')}
                        </h3>
                        <ul className="space-y-3">
                            {navigation.company.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                                    >
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links — only rendered when entries exist */}
                    {navigation.legal.length > 0 && (
                        <div>
                            <h3 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">
                                {t('sections.legal')}
                            </h3>
                            <ul className="space-y-3">
                                {navigation.legal.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className="text-sm text-gray-400 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                                        >
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Social Media & Copyright */}
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-gray-500 order-2 sm:order-1">
                            {t('copyright', { year: new Date().getFullYear() })}
                        </p>
                        <div className="flex items-center gap-2 order-1 sm:order-2">
                            {social.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <a
                                        key={item.name}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                        aria-label={t('social.followLabel', { platform: item.name })}
                                    >
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
