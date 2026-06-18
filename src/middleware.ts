import { withAuth } from 'next-auth/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// ─── next-intl middleware ───────────────────────────────────────────────────
// Handles locale prefix routing (/en/... and /ar/...) and sets the
// locale cookie so Server Components know which language to load.
// This runs ONLY for public routes — protected routes are handled separately.
const intlMiddleware = createIntlMiddleware(routing);

// ─── Rate limiter ────────────────────────────────────────────────────────────
const globalRateLimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(100, '10 s'),
    analytics: true,
});

// ─── Public API routes — no auth required ─────────────────────────────────
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

// ─── Affiliate referral cookie ───────────────────────────────────────────────
const AFFILIATE_CODE_REGEX = /^VOL_[A-Z0-9]{6}$/;
const REF_COOKIE_NAME = 'innoaccess_ref';
const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

// ─── Route classification helpers ───────────────────────────────────────────
/**
 * Returns true for routes that need next-intl locale handling.
 * These are the public-facing pages that will be translated.
 * NOTE: we strip the locale prefix when checking — next-intl will have
 * already injected the prefix, but we need to recognise the pattern.
 */
function isLocaleRoute(path: string): boolean {
    // Matches /en/... or /ar/... prefixed paths, plus the bare / root
    return (
        path === '/' ||
        /^\/(en|ar)(\/|$)/.test(path)
    );
}

/**
 * Returns true for paths that must BYPASS next-intl and go straight to
 * the withAuth-protected pipeline (or be served as-is for APIs).
 */
function isProtectedRoute(path: string): boolean {
    return (
        path.startsWith('/admin') ||
        path.startsWith('/company') ||
        path.startsWith('/trainer') ||
        path.startsWith('/dashboard') ||
        path.startsWith('/volunteer') ||
        path.startsWith('/profile') ||
        path.startsWith('/notifications') ||
        path.startsWith('/user') ||
        path.startsWith('/join-trainer') ||
        path.startsWith('/api')
    );
}

// ─── withAuth — protected route middleware ────────────────────────────────────
export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;
        const path  = req.nextUrl.pathname;

        // ── Real client IP behind Cloudflare ───────────────────────────────
        const ip =
            req.headers.get('cf-connecting-ip')
            ?? req.headers.get('x-real-ip')
            ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? req.ip
            ?? '127.0.0.1';

        // ── next-intl: handle locale prefix for public routes ─────────────
        // If this request is for a locale-aware public page, delegate to
        // next-intl's middleware first. It handles:
        //   • Redirecting / → /en/
        //   • Detecting locale from URL and setting NEXT_LOCALE cookie
        //   • Stripping the locale prefix for Next.js file routing
        if (isLocaleRoute(path) && !isProtectedRoute(path)) {
            return intlMiddleware(req as unknown as NextRequest);
        }

        // ── Affiliate referral cookie ─────────────────────────────────────
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

                // Apply role checks to the same response object
                if (path.startsWith('/admin') && token?.role !== 'admin') {
                    return NextResponse.redirect(new URL('/', req.url));
                }
                if (path.startsWith('/company') && token?.role !== 'company') {
                    return NextResponse.redirect(new URL('/', req.url));
                }
                if (path.startsWith('/trainer') && token?.role !== 'trainer') {
                    const isManagePath = /^\/trainer\/courses\/[^\/]+\/manage/.test(path);
                    if (!(isManagePath && token?.role === 'company')) {
                        return NextResponse.redirect(new URL('/join-trainer', req.url));
                    }
                }
                if (path.startsWith('/volunteer') && token?.role !== 'volunteer') {
                    return NextResponse.redirect(new URL('/dashboard', req.url));
                }
                if (token?.role === 'company' && !token?.isApproved && !path.startsWith('/company/pending')) {
                    return NextResponse.redirect(new URL('/company/pending', req.url));
                }

                return response;
            }
        }

        // ── Rate limiting for all API routes ──────────────────────────────
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
                console.warn('⚠️  Rate limiter unavailable, skipping:', (rateLimitError as Error).message);
            }
        }

        // ── Role-based route protection ────────────────────────────────────
        if (path.startsWith('/admin') && token?.role !== 'admin') {
            return NextResponse.redirect(new URL('/', req.url));
        }
        if (path.startsWith('/company') && token?.role !== 'company') {
            return NextResponse.redirect(new URL('/', req.url));
        }
        if (path.startsWith('/trainer') && token?.role !== 'trainer') {
            const isManagePath = /^\/trainer\/courses\/[^\/]+\/manage/.test(path);
            if (isManagePath && token?.role === 'company') {
                // allow through
            } else {
                return NextResponse.redirect(new URL('/join-trainer', req.url));
            }
        }
        if (path.startsWith('/volunteer') && token?.role !== 'volunteer') {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
        if (token?.role === 'company' && !token?.isApproved && !path.startsWith('/company/pending')) {
            return NextResponse.redirect(new URL('/company/pending', req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const path = req.nextUrl.pathname;

                // Always allow /api/auth (NextAuth internals)
                if (path.startsWith('/api/auth')) return true;

                // Allow locale-aware public pages — next-intl handles them above
                // withAuth's authorized callback must not block them
                if (isLocaleRoute(path) && !isProtectedRoute(path)) return true;

                // Allow public API routes
                if (isPublicApiRoute(path)) return true;

                // All other matched routes require a valid session
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static (static files)
         * - _next/image (Next.js image optimization)
         * - favicon.ico, robots.txt, sitemap.xml
         * - Public assets in /public
         *
         * This intentionally matches locale-prefix paths like /en/... and /ar/...
         * so next-intl can handle them, AND matches protected paths so withAuth
         * can handle those.
         */
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
    ],
};
