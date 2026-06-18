/**
 * Root layout — minimal HTML shell.
 *
 * This file is the top-level layout in the Next.js App Router.
 * It must exist to satisfy the Next.js requirement for a root layout.
 *
 * ─── Architecture note ──────────────────────────────────────────────────────
 * All public-facing pages now live under src/app/[locale]/ which has its own
 * layout.tsx. That locale layout:
 *  - Sets lang={locale} and dir={rtl|ltr} on <html>
 *  - Wraps children in NextIntlClientProvider + SessionProvider
 *  - Renders Header and Footer
 *
 * Protected routes (/admin, /company, /trainer, /dashboard, /volunteer)
 * are NOT locale-aware — they keep their own nested layouts (or inherit this).
 * They do NOT get Header/Footer from this root layout.
 *
 * If protected routes need their own shell, they should add a layout.tsx
 * in their own directory (e.g. src/app/admin/layout.tsx).
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
