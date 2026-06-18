import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import '../globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SessionProvider } from '@/components/providers/SessionProvider';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Locale = (typeof routing.locales)[number];

interface LocaleLayoutProps {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}

// ─── Metadata (locale-aware) ────────────────────────────────────────────────────

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Landing' });

    return {
        title: 'InnoAccess — ' + t('hero.headingAccent'),
        description: t('hero.description'),
        alternates: {
            canonical: `/${locale}`,
            languages: {
                en: '/en',
                ar: '/ar',
            },
        },
    };
}

// ─── Static params — required for static generation ────────────────────────────

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

// ─── Layout ─────────────────────────────────────────────────────────────────────

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
    const { locale } = await params;

    // Validate the locale against our routing config.
    // If an invalid segment is passed (e.g. /xx/...), Next.js 404s.
    if (!routing.locales.includes(locale as Locale)) {
        notFound();
    }

    // Load all messages for this locale server-side.
    // NextIntlClientProvider serialises these and ships them to the client.
    const messages = await getMessages();

    // RTL direction for Arabic
    const dir = locale === 'ar' ? 'rtl' : 'ltr';

    return (
        <html lang={locale} dir={dir}>
            <body suppressHydrationWarning>
                <NextIntlClientProvider messages={messages}>
                    <SessionProvider>
                        {/*
                          * Skip link — always the first focusable element.
                          * The href targets #main-content which each page renders.
                          */}
                        <a href="#main-content" className="skip-link">
                            {locale === 'ar' ? 'انتقل إلى المحتوى الرئيسي' : 'Skip to main content'}
                        </a>
                        <Header locale={locale} />
                        {children}
                        <Footer locale={locale} />
                    </SessionProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
