import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Create a new ratelimiter, allowing 100 requests per 10 seconds per IP
const globalRateLimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(100, '10 s'),
    analytics: true,
});

// Public API routes that do NOT require authentication
const PUBLIC_API_ROUTES = [
    '/api/jobs',
    '/api/courses',
    '/api/categories',
    '/api/auth',
    '/api/contact',
];

const isPublicApiRoute = (path: string) =>
    PUBLIC_API_ROUTES.some((route) => path.startsWith(route));

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;
        const ip = req.ip ?? '127.0.0.1';

        // Global Rate Limiting for all API routes
        // Wrapped in try/catch so a broken Upstash KV config never crashes the
        // entire middleware and blocks every API request (fail-open in dev).
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
                                'X-RateLimit-Limit': limit.toString(),
                                'X-RateLimit-Remaining': remaining.toString(),
                                'X-RateLimit-Reset': reset.toString()
                            }
                        }
                    );
                }
            } catch (rateLimitError) {
                // KV not configured / unreachable — log and continue (fail-open)
                console.warn('⚠️  Rate limiter unavailable, skipping:', (rateLimitError as Error).message);
            }
        }

        // Protect admin routes
        if (path.startsWith('/admin') && token?.role !== 'admin') {
            return NextResponse.redirect(new URL('/', req.url));
        }

        // Protect company routes
        if (path.startsWith('/company') && token?.role !== 'company') {
            return NextResponse.redirect(new URL('/', req.url));
        }

        // Protect trainer routes
        // Note: TrainerProfile approval updates User.role to 'trainer'
        // So if role !== 'trainer', they either haven't applied or aren't approved yet
        if (path.startsWith('/trainer') && token?.role !== 'trainer') {
            // Redirect to application page if not a trainer
            return NextResponse.redirect(new URL('/join-trainer', req.url));
        }

        // Check company approval
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

                // Allow public API routes without a session so unauthenticated
                // visitors can browse jobs, courses, and categories
                if (isPublicApiRoute(path)) return true;

                // All other matched routes require a valid session
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: ['/api/:path*', '/admin/:path*', '/company/:path*', '/trainer/:path*', '/dashboard/:path*'],
};
