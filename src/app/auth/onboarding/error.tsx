'use client';

/**
 * Next.js App Router Error Boundary for /auth/onboarding
 *
 * This file is automatically used by Next.js when the page component
 * (or any component it renders) throws an unhandled exception during
 * the render phase. It prevents the generic white-screen crash and
 * instead shows a styled, recoverable error UI.
 *
 * Props contract (enforced by Next.js App Router):
 *   - error: the Error object that was thrown
 *   - reset: a function to re-render the segment and retry
 */

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';

interface ErrorBoundaryProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function OnboardingError({ error, reset }: ErrorBoundaryProps) {
    useEffect(() => {
        // Log to Vercel function logs so we have the exact stack trace
        console.error(
            'ONBOARDING_RENDER_ERROR:',
            JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
        );
    }, [error]);

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
                    Something went wrong
                </h1>

                {/* Human-readable description */}
                <p className="text-sm text-gray-600 mb-4">
                    The onboarding page encountered an unexpected error. Your account has
                    not been affected. You can try again or sign out and come back later.
                </p>

                {/* Exact error message box (helpful in production debugging) */}
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-left">
                    <p className="text-xs font-mono text-red-700 break-words whitespace-pre-wrap">
                        {error?.message || 'Unknown render error'}
                    </p>
                    {error?.digest && (
                        <p className="text-xs text-red-400 mt-1">
                            Digest: {error.digest}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={reset}
                        id="onboarding-error-retry-btn"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 transition-all min-h-[44px]"
                        aria-label="Retry loading the onboarding page"
                    >
                        <RefreshCw className="w-4 h-4" aria-hidden="true" />
                        Try Again
                    </button>

                    <a
                        href="/auth/signin"
                        id="onboarding-error-signin-btn"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 transition-all min-h-[44px]"
                        aria-label="Go back to the sign-in page"
                    >
                        <LogIn className="w-4 h-4" aria-hidden="true" />
                        Back to Sign In
                    </a>
                </div>
            </div>
        </main>
    );
}
