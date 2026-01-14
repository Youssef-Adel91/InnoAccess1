import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Protect admin routes
        if (path.startsWith('/admin') && token?.role !== 'admin') {
            return NextResponse.redirect(new URL('/unauthorized', req.url));
        }

        // Protect company routes
        if (path.startsWith('/company') && token?.role !== 'company') {
            return NextResponse.redirect(new URL('/unauthorized', req.url));
        }

        // Protect trainer routes
        if (path.startsWith('/trainer') && token?.role !== 'trainer') {
            return NextResponse.redirect(new URL('/unauthorized', req.url));
        }

        // Check company approval
        if (token?.role === 'company' && !token?.isApproved && !path.startsWith('/company/pending')) {
            return NextResponse.redirect(new URL('/company/pending', req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: ['/admin/:path*', '/company/:path*', '/trainer/:path*', '/dashboard/:path*', '/api/admin/:path*'],
};
