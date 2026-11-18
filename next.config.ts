import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const isDev = process.env.NODE_ENV !== 'production';

// frame-ancestors is ignored in report-only mode, so it is enforced in its own header
const REPORT_ONLY_CSP = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.pusher.com wss://*.pusher.com",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

export const SECURITY_HEADERS = [
    { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
    {
        key: 'Content-Security-Policy-Report-Only',
        value: REPORT_ONLY_CSP,
    },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
];

function supabaseImagePatterns() {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!raw) return [];

    const { protocol, hostname, port } = new URL(raw);

    return [
        {
            protocol: protocol.replace(':', '') as 'http' | 'https',
            hostname,
            ...(port ? { port } : {}),
            pathname: '/storage/v1/object/public/**',
        },
    ];
}

const nextConfig: NextConfig = {
    // CSS goes into the HTML instead of render-blocking requests (mobile LCP on the landing)
    experimental: { inlineCss: true },
    async headers() {
        return [
            { source: '/:path*', headers: SECURITY_HEADERS },
            {
                source: '/fonts/:file*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
    async redirects() {
        return [
            {
                source: '/campaigns/:id/dm/artifacts/sets/new',
                destination: '/campaigns/:id/dm/artifact-sets/new',
                permanent: false,
            },
            {
                source: '/campaigns/:id/dm/artifacts/sets/:setId',
                destination: '/campaigns/:id/dm/artifact-sets/:setId',
                permanent: false,
            },
            {
                source: '/campaigns/:id/dm/artifacts/sets',
                destination: '/campaigns/:id/dm/artifact-sets',
                permanent: false,
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'static.wikia.nocookie.net',
                pathname: '/**',
            },
            ...supabaseImagePatterns(),
        ],
    },
};

export default withNextIntl(nextConfig);
