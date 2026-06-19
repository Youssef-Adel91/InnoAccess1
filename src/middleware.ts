import { withAuth } from 'next-auth/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// ─── next-intl middleware ─────────────────────────────────────────────────────
// Now handles ALL non-API routes — both public and protected pages live under
// [locale]/, so every page request needs locale detection/prefix handling.
const intlMiddleware = createIntlMiddleware(routing);

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const globalRateLimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(100, '10 s'),
    analytics: true,
});

// ─── Public API routes — no auth required ─────────────────────────────────────
const PUBLIC_API_ROUTES = [
    '/api/jobs',
    '/api/courses',
    '/api/categories',
    '/api/auth',
    '/api/contact',
    '/api/blob',
];
const isPublicApiRoute = (path: string) =>
    PUBLIC_API_ROUTES.some((route) => path.startsWith(route));

// ─── Affiliate referral cookie ─────────────────────────────────────────────────
const AFFILIATE_CODE_REGEX = /^VOL_[A-Z0-9]{6}$/;
const REF_COOKIE_NAME      = 'innoaccess_ref';
const REF_COOKIE_MAX_AGE   = 60 * 60 * 24 * 7; // 7 days

// ─── Locale helpers ───────────────────────────────────────────────────────────

/**
 * Strips the locale prefix from a path so we can match against
 * role-protection patterns that don't know about locale prefixes.
 *
 * Examples:
 *   /en/admin      → /admin
 *   /ar/dashboard  → /dashboard
 *   /en/           → /
 *   /about         → /about  (no prefix found — returned unchanged)
 */
function stripLocale(path: string): string {
    for (const locale of routing.locales) {
        if (path.startsWith(`/${locale}/`)) {
            return path.slice(locale.length + 1); // e.g. "/en/admin" → "/admin"
        }
        if (path === `/${locale}`) {
            return '/';
        }
    }
    return path;
}

/**
 * Extracts the active locale from the path.
 * Falls back to the default locale if none found.
 */
function extractLocale(path: string): string {
    for (const locale of routing.locales) {
        if (path.startsWith(`/${locale}/`) || path === `/${locale}`) {
            return locale;
        }
    }
    return routing.defaultLocale;
}

/**
 * Returns true for paths that require authentication (after locale is stripped).
 */
function isProtectedPath(strippedPath: string): boolean {
    return (
        strippedPath.startsWith('/admin')        ||
        strippedPath.startsWith('/company')      ||
        strippedPath.startsWith('/trainer')      ||
        strippedPath.startsWith('/dashboard')    ||
        strippedPath.startsWith('/volunteer')    ||
        strippedPath.startsWith('/profile')      ||
        strippedPath.startsWith('/notifications') ||
        strippedPath.startsWith('/user')         ||
        strippedPath.startsWith('/join-trainer')
    );
}

// ─── withAuth — unified middleware ────────────────────────────────────────────
export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;
        const path  = req.nextUrl.pathname;

        // ── Real client IP (behind Cloudflare) ──────────────────────────────
        const ip =
            req.headers.get('cf-connecting-ip')
            ?? req.headers.get('x-real-ip')
            ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? req.ip
            ?? '127.0.0.1';

        // ── API routes: rate-limit only, skip intl ───────────────────────────
        if (path.startsWith('/api')) {
            try {
                const { success, limit, reset, remaining } = await globalRateLimit.limit(
                    `global_api_${ip}`
                );
                if (!success) {
                    return NextResponse.json(
                        { error: 'Too many requests. Please try again later.' },
                        {
                            status: 429,
                            headers: {
                                'X-RateLimit-Limit':     limit.toString(),
                                'X-RateLimit-Remaining': remaining.toString(),
                                'X-RateLimit-Reset':     reset.toString(),
                            },
                        }
                    );
                }
            } catch (rateLimitError) {
                console.warn('⚠️  Rate limiter unavailable:', (rateLimitError as Error).message);
            }
            return NextResponse.next();
        }

        // ── Affiliate referral cookie ────────────────────────────────────────
        const refCode = req.nextUrl.searchParams.get('ref');
        if (refCode && AFFILIATE_CODE_REGEX.test(refCode)) {
            const existingCookie = req.cookies.get(REF_COOKIE_NAME)?.value;
            if (existingCookie !== refCode) {
                const response = NextResponse.next();
                response.cookies.set(REF_COOKIE_NAME, refCode, {
                    httpOnly: true,
                    secure:   process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge:   REF_COOKIE_MAX_AGE,
                    path:     '/',
                });
                return response;
            }
        }

        // ── Role-based protection (locale-aware) ─────────────────────────────
        // Strip the locale prefix so we can match against /admin, /dashboard etc.
        const strippedPath = stripLocale(path);
        const locale       = extractLocale(path);

        // Helper: build a redirect to a locale-prefixed path
        const localRedirect = (target: string) =>
            NextResponse.redirect(new URL(`/${locale}${target}`, req.url));

        if (strippedPath.startsWith('/admin') && token?.role !== 'admin') {
            return localRedirect('/');
        }
        if (strippedPath.startsWith('/company') && token?.role !== 'company') {
            return localRedirect('/');
        }
        if (strippedPath.startsWith('/trainer') && token?.role !== 'trainer') {
            const isManagePath = /^\/trainer\/courses\/[^/]+\/manage/.test(strippedPath);
            if (isManagePath && token?.role === 'company') {
                // company can manage their own trainer courses — allow through
            } else {
                return localRedirect('/join-trainer');
            }
        }
        if (strippedPath.startsWith('/volunteer') && token?.role !== 'volunteer') {
            return localRedirect('/dashboard');
        }
        if (
            token?.role === 'company' &&
            !token?.isApproved &&
            !strippedPath.startsWith('/company/pending')
        ) {
            return localRedirect('/company/pending');
        }

        // ── next-intl: locale routing for all non-API routes ─────────────────
        // Runs for every page request (public + protected alike).
        // Handles:  / → /en/   |  locale cookie  |  URL rewriting for file routing
        return intlMiddleware(req as unknown as NextRequest);
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const path = req.nextUrl.pathname;

                // Always allow NextAuth internals
                if (path.startsWith('/api/auth')) return true;

                // Allow all public API routes
                if (isPublicApiRoute(path)) return true;

                // Allow all other API routes through (will hit the rate-limiter above)
                if (path.startsWith('/api')) return true;

                // Strip locale prefix and check if the path is protected
                const strippedPath = stripLocale(path);
                if (!isProtectedPath(strippedPath)) return true;

                // Protected paths require a valid session token
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT static assets.
         * This covers:
         *   /                       → intl redirects to /en/
         *   /en/dashboard           → intl + auth check
         *   /ar/admin               → intl + auth check
         *   /api/jobs               → public API (rate-limited)
         *   /api/admin/analytics    → protected API (rate-limited)
         */
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
    ],
};
