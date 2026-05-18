'use client';

/**
 * /auth/error — NextAuth Error Page
 *
 * NextAuth redirects here when authentication fails (AccessDenied, OAuthCallback,
 * Configuration, Verification, etc.). Without this page, users hit a 404.
 *
 * URL format: /auth/error?error=<ErrorCode>
 *
 * Must be a Client Component using Suspense because useSearchParams() requires it
 * in Next.js App Router.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, LogIn, RefreshCw } from 'lucide-react';

// ── Error code → human-readable message map ────────────────────────────────
const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
    AccessDenied: {
        title: 'Access Denied',
        description:
            'Your sign-in was blocked. This can happen if your account was previously registered with email & password. Try signing in with your email and password instead, or contact support.',
    },
    OAuthAccountNotLinked: {
        title: 'Account Already Exists',
        description:
            'An account with this email address already exists using a different sign-in method. Please sign in using your original method (email & password), then link Google from your profile settings.',
    },
    OAuthCallback: {
        title: 'Sign-In Callback Error',
        description:
            'An error occurred during the Google sign-in process. This is usually temporary. Please try again.',
    },
    OAuthCreateAccount: {
        title: 'Account Creation Failed',
        description:
            'We could not create your account. This may be a temporary server issue. Please try again in a moment.',
    },
    EmailCreateAccount: {
        title: 'Account Creation Failed',
        description: 'We could not create your account with this email address. Please try a different method.',
    },
    Callback: {
        title: 'Authentication Error',
        description: 'An error occurred during authentication. Please try again.',
    },
    Configuration: {
        title: 'Server Configuration Error',
        description:
            'There is a problem with the server configuration. Please contact support and reference error code: Configuration.',
    },
    Verification: {
        title: 'Verification Link Expired',
        description: 'The sign-in link has expired or has already been used. Please request a new one.',
    },
    Default: {
        title: 'Authentication Error',
        description: 'An unexpected error occurred during sign-in. Please try again or use a different method.',
    },
};

// ── Inner component that reads the search param ─────────────────────────────
function AuthErrorContent() {
    const searchParams = useSearchParams();
    const errorCode = searchParams.get('error') ?? 'Default';
    const { title, description } = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;

    return (
        <main
            id="main-content"
            className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex flex-col items-center justify-center px-4 py-12"
            role="alert"
            aria-live="assertive"
        >
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg ring-1 ring-red-200 px-8 py-10 text-center">

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-5">
                    <AlertTriangle className="w-8 h-8 text-red-600" aria-hidden="true" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
                    <span>{title}</span>
                </h1>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    <span>{description}</span>
                </p>

                {/* Error code badge for debugging */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-6 inline-block">
                    <span className="text-xs font-mono text-gray-500">
                        <span>Error code: </span>
                        <span className="text-red-600 font-semibold">{errorCode}</span>
                    </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <a
                        href="/auth/signin"
                        id="auth-error-signin-btn"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 transition-all min-h-[44px]"
                        aria-label="Go back to the sign-in page"
                    >
                        <LogIn className="w-4 h-4" aria-hidden="true" />
                        <span>Back to Sign In</span>
                    </a>

                    <button
                        type="button"
                        id="auth-error-retry-btn"
                        onClick={() => window.location.href = '/auth/signin'}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 transition-all min-h-[44px]"
                        aria-label="Try signing in again"
                    >
                        <RefreshCw className="w-4 h-4" aria-hidden="true" />
                        <span>Try Again</span>
                    </button>
                </div>

                {/* Support note */}
                <p className="mt-6 text-xs text-gray-400">
                    <span>{'If this keeps happening, please '}</span>
                    <a
                        href="/contact"
                        className="underline hover:text-gray-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 rounded"
                    >
                        <span>contact support</span>
                    </a>
                    <span>{' and mention the error code above.'}</span>
                </p>
            </div>
        </main>
    );
}

// ── Page export: wrap in Suspense (required for useSearchParams in App Router) ──
export default function AuthErrorPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" aria-label="Loading error details…" />
                </div>
            }
        >
            <AuthErrorContent />
        </Suspense>
    );
}
