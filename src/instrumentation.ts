/**
 * src/instrumentation.ts — Next.js 15 Instrumentation Hook
 *
 * This file is automatically detected by Next.js when the
 * `experimental.instrumentationHook` option is enabled (true by default
 * in Next.js 15). It runs ONCE when the server worker initialises —
 * not per-request — making it ideal for priming long-lived resources.
 *
 * ─── Why this file exists ────────────────────────────────────────────────────
 * Problem:  The first POST /api/auth/callback/credentials after a cold start
 *           hits ~1-2 s of MongoDB connection overhead. This compounds with
 *           Cloudflare's 100 s proxy timeout, causing intermittent 502s for
 *           users who land on the site after a period of inactivity.
 *
 * Fix:      Pre-establish the connection during the worker init phase so the
 *           connection pool is ready before the first real user request arrives.
 *
 * ─── Runtime guard ───────────────────────────────────────────────────────────
 * We check `process.env.NEXT_RUNTIME === 'nodejs'` before importing `connectDB`
 * because:
 *  a) The Edge runtime doesn't support the Node.js `net` module that
 *     Mongoose depends on — importing it would crash the edge worker.
 *  b) The middleware runs in the Edge runtime; this file must NOT break it.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            // Dynamic import keeps this module out of the edge bundle entirely.
            const { connectDB } = await import('@/lib/db');
            await connectDB();
            console.log('🚀 [instrumentation] MongoDB pre-warmed successfully.');
        } catch (err) {
            // Log but don't crash the worker — the app can still serve pages;
            // individual API routes will retry the connection on their own.
            console.error('⚠️  [instrumentation] MongoDB pre-warm failed:', err);
        }
    }
}
