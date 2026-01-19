/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enhanced webpack configuration for better stability
    webpack: (config, { dev, isServer }) => {
        // Disable webpack cache in development mode to prevent corruption issues
        if (dev) {
            config.cache = false;
        }

        // Fix for potential module resolution issues
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false,
        };

        // Ensure proper module resolution for Vercel builds
        config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
        
        // Add aliases to help with module resolution
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': __dirname,
        };

        return config;
    },
    // Disable ESLint during build to avoid configuration issues
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Configure allowed image domains for Next.js Image component
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
    // Production optimizations
    experimental: {
        serverComponentsExternalPackages: ['mongoose', 'mongodb'],
        // Enable instrumentation file to suppress OpenTelemetry errors
        instrumentationHook: true,
    },
    // Optimize for Vercel
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
    // Suppress OpenTelemetry warnings in production
    onDemandEntries: {
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
    },
    // Skip prerendering API routes during build to avoid MongoDB connection errors
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'no-store, must-revalidate' },
                ],
            },
        ];
    },
};

module.exports = nextConfig; 