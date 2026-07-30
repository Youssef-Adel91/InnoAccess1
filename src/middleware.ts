import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const isPublicRoute = createRouteMatcher([
    '/',
    '/:locale',
    '/:locale/auth/(.*)',
    '/:locale/courses',
    '/:locale/courses/(.*)',
    '/:locale/jobs',
    '/:locale/jobs/(.*)',
    '/:locale/about',
    '/:locale/contact',
    '/:locale/privacy',
    '/:locale/terms',
    '/api/webhooks/(.*)',
    '/api/public/(.*)',
    '/api/notifications/(.*)',
    '/api/auth/(.*)',
    '/api/courses',
    '/api/courses/(.*)',
    '/api/jobs',
    '/api/jobs/(.*)',
    '/api/categories',
    '/api/categories/(.*)',
    '/api/contact',
]);

const isOnboardingRoute = createRouteMatcher(['/:locale/onboarding']);
const isAuthRoute = createRouteMatcher([
    '/:locale/auth/login(.*)',
    '/:locale/auth/register(.*)',
]);

function extractLocale(pathname: string): string {
    const segments = pathname.split('/');
    const maybeLocale = segments[1];
    if (routing.locales.includes(maybeLocale as any)) {
        return maybeLocale;
    }
    return routing.defaultLocale;
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
    const { userId, sessionClaims } = await auth();
    const path = req.nextUrl.pathname;
    const locale = extractLocale(path);

    // Check for affiliate referral query param ?ref=...
    const refParam = req.nextUrl.searchParams.get('ref');
    const validRef = refParam && refParam.trim().length >= 3 ? refParam.trim().toUpperCase() : undefined;

    const attachRefCookie = (res: NextResponse) => {
        if (validRef) {
            res.cookies.set('innoaccess_ref', validRef, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60, // 30 days
                path: '/',
            });
        }
        return res;
    };

    // 1. STRICTLY IGNORE API/TRPC routes from being processed by next-intl localization
    //    We return early so intlMiddleware is never called for API routes.
    if (path.startsWith('/api') || path.startsWith('/trpc')) {
        if (!isPublicRoute(req)) {
            await auth.protect();
        }
        return NextResponse.next();
    }

    const userRole = (sessionClaims?.metadata as { role?: string })?.role;

    // 2. If logged in without a role, force redirect to /onboarding
    if (
        userId &&
        !userRole &&
        !isOnboardingRoute(req) &&
        !isAuthRoute(req)
    ) {
        const onboardingUrl = new URL(`/${locale}/onboarding`, req.url);
        return attachRefCookie(NextResponse.redirect(onboardingUrl));
    }

    // 3. If logged in WITH a role and trying to visit /onboarding OR an auth route,
    //    redirect them directly to their specific role dashboard
    if (userId && userRole && (isOnboardingRoute(req) || isAuthRoute(req))) {
        const destination =
            userRole === 'student'
                ? `/${locale}/dashboard`
                : `/${locale}/${userRole}`;
        return attachRefCookie(NextResponse.redirect(new URL(destination, req.url)));
    }

    // 4. Protect non-public routes (require authentication)
    if (!isPublicRoute(req)) {
        await auth.protect();
    }

    // 5. Run next-intl middleware for localization on page routes only
    const res = intlMiddleware(req);
    return attachRefCookie(res);
});

export const config = {
    matcher: [
        // Match all page routes and API routes so clerkMiddleware runs,
        // while excluding static files and Next internals
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
