/**
 * Protected Routes Root Layout
 *
 * This layout covers all non-locale routes that require authentication:
 * /admin, /company, /trainer, /dashboard, /volunteer, /profile, etc.
 *
 * These routes are NOT locale-aware (they stay at /admin/... not /en/admin/...)
 * so they cannot use the [locale]/layout.tsx which wraps Next-intl.
 *
 * This layout provides:
 *  - <html> and <body> tags (required by Next.js for any non-locale page)
 *  - SessionProvider so authenticated components can read session
 *  - Header and Footer (English-only, no language switcher for authenticated UI)
 *  - globals.css imported here so protected pages have the same styles
 *
 * ─── Architecture note ────────────────────────────────────────────────────────
 * Next.js App Router uses the CLOSEST layout to a route segment.
 * A layout at src/app/admin/layout.tsx covers /admin/*.
 * Since the root src/app/layout.tsx is now a pass-through shell, this
 * per-section layout provides the full HTML document structure.
 */
import type { Metadata } from 'next';
import '../globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { NextIntlClientProvider } from 'next-intl';

// Import English messages directly for the protected (always-English) area
// Using @/ alias which resolves to src/ — messages/ is at project root so
// we must use a relative path or configure the tsconfig path alias.
import enMessages from '../../../messages/en.json';

export const metadata: Metadata = {
    title: 'InnoAccess — Dashboard',
    description: 'InnoAccess protected area',
};

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" dir="ltr">
            <body suppressHydrationWarning>
                {/*
                  * NextIntlClientProvider is needed because Header/Footer now use
                  * useTranslations(). We provide the English messages here so
                  * all translation calls resolve correctly in the protected area.
                  */}
                <NextIntlClientProvider locale="en" messages={enMessages}>
                    <SessionProvider>
                        <a href="#main-content" className="skip-link">
                            Skip to main content
                        </a>
                        <Header locale="en" />
                        {children}
                        <Footer locale="en" />
                    </SessionProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
