const createNextIntlPlugin = require('next-intl/plugin');

/**
 * next-intl plugin — wraps the Next.js config to enable:
 *  - Server Component message loading via src/i18n/request.ts
 *  - Automatic locale detection and routing integration
 *  - TypeScript type generation for translation keys
 */
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Fix ERR_REQUIRE_ESM: exclude packages that use ESM internally from the
    // Next.js serverless bundle so Node.js loads them natively at runtime.
    serverExternalPackages: [
        'jsdom',
        'html-encoding-sniffer',
        '@exodus/bytes',
        'isomorphic-dompurify',
        'bcrypt',
        'nodemailer',
    ],
    transpilePackages: ['@react-pdf/renderer'],
    // Allow larger request bodies for Server Actions (e.g. course thumbnail uploads up to 10MB)
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
        // Enable instrumentation.ts for MongoDB pre-warming on server startup.
        // instrumentationHook is stable and always enabled in Next.js 15.3+
        // (no longer needs to be explicitly declared here).
    },
    eslint: {
        // Disable ESLint during builds for Vercel deployment
        ignoreDuringBuilds: true,
    },
    // TEMPORARY: Ignore TypeScript errors due to Vercel cache issue
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
        ],
    },
    // Security Headers
    async headers() {
        return [
            {
                // Apply security headers to all routes
                source: '/:path*',
                headers: [
                    // DNS Prefetch Control - allows browser to prefetch DNS
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    // Strict Transport Security - Forces HTTPS
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    // X-Frame-Options - Prevents clickjacking by blocking iframe embedding
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    // X-Content-Type-Options - Prevents MIME type sniffing
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    // X-XSS-Protection - Legacy XSS filter for older browsers
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    // Referrer Policy - Controls referrer information
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin',
                    },
                    // Permissions Policy - Restricts browser features
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
                    },
                    // Content Security Policy - Prevents XSS and injection attacks
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "font-src 'self' https://fonts.gstatic.com",
                            "img-src 'self' data: https: blob: https://img.youtube.com",
                            "media-src 'self' blob: https://res.cloudinary.com https://video.bunnycdn.com",
                            "connect-src 'self' https://challenges.cloudflare.com https://api.cloudinary.com https://res.cloudinary.com https://upload.cloudinary.com https://video.bunnycdn.com",
                            // Added YouTube domains for embedded video player
                            "frame-src 'self' https://challenges.cloudflare.com https://iframe.mediadelivery.net https://www.youtube.com https://youtube.com",
                        ].join('; '),
                    },
                ],
            },
        ];
    },
}

module.exports = withNextIntl(nextConfig);
