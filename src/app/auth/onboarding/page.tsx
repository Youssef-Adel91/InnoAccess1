/**
 * /auth/onboarding — SSR-free page wrapper
 *
 * Why { ssr: false }?
 * This page is authenticated-only (no SEO value) and its entire logic
 * depends on the NextAuth client session, browser APIs, and useState.
 * SSR would cause a mismatch between the server-rendered session state
 * (always null/loading) and the client session state, producing the
 * classic React hydration crash ("removeChild on Node" or white screen).
 *
 * By disabling SSR, Next.js skips server rendering entirely for this route.
 * React mounts the component fresh on the client after hydration is complete,
 * guaranteeing the DOM the browser sees matches what React renders — zero mismatch.
 */

import dynamic from 'next/dynamic';

const OnboardingClient = dynamic(
    () => import('./OnboardingClient'),
    {
        ssr: false,
        loading: () => (
            // Matches the client component's loading skeleton exactly —
            // prevents a layout shift during the dynamic import resolution.
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-label="Loading…" />
            </div>
        ),
    }
);

export default function OnboardingPage() {
    return <OnboardingClient />;
}
