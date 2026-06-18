/**
 * Protected Routes Layout (pass-through)
 *
 * This route group covers all authenticated routes:
 * /[locale]/admin, /[locale]/dashboard, /[locale]/company, etc.
 *
 * ─── Architecture note ────────────────────────────────────────────────────────
 * This layout is nested INSIDE src/app/[locale]/layout.tsx, which already
 * provides everything needed:
 *  ✓  <html lang dir>          (locale-aware)
 *  ✓  <body>
 *  ✓  NextIntlClientProvider   (correct locale messages loaded)
 *  ✓  SessionProvider          (NextAuth session context)
 *  ✓  Header + Footer
 *
 * This file is therefore a transparent pass-through — it exists only to
 * define the (protected) route group boundary so Next.js can apply
 * role-based middleware to it without affecting the URL structure.
 * The parentheses make this a route group: the segment does NOT appear in URLs.
 */
export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
