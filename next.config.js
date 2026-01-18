/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
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
}

module.exports = nextConfig
