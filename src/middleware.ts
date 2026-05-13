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

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;
        const ip = req.ip ?? '127.0.0.1';

        // Global Rate Limiting for all API routes
        if (path.startsWith('/api')) {
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
                // Allow unauthenticated users to access /api/auth routes
                if (req.nextUrl.pathname.startsWith('/api/auth')) return true;
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: ['/api/:path*', '/admin/:path*', '/company/:path*', '/trainer/:path*', '/dashboard/:path*'],
};
