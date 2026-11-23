import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import {
    CSP_REPORT_GROUP,
    CSP_REPORT_PATH,
    ENFORCED_CSP,
    NONCE_PATH_PREFIXES,
    STATIC_REPORT_ONLY_CSP,
} from './lib/security/csp';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

export const PERMISSIONS_POLICY =
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()';

export const SECURITY_HEADERS = [
    { key: 'Content-Security-Policy', value: ENFORCED_CSP },
    {
        key: 'Reporting-Endpoints',
        value: `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`,
    },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000',
    },
];

export const STATIC_CSP_HEADER = {
    key: 'Content-Security-Policy-Report-Only',
    value: STATIC_REPORT_ONLY_CSP,
};

function storageImagePatterns() {
    return [
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
    ].flatMap((raw) => {
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
    });
}

const nextConfig: NextConfig = {
    // separate output lets a production build run beside `next dev`
    distDir: process.env.NEXT_DIST_DIR || '.next',
    // CSS goes into the HTML instead of render-blocking requests (mobile LCP on the landing)
    experimental: { inlineCss: true },
    async headers() {
        return [
            { source: '/:path*', headers: SECURITY_HEADERS },
            {
                source: `/((?!(?:${NONCE_PATH_PREFIXES.map((p) => p.slice(1)).join('|')})(?:/|$)).*)`,
                headers: [STATIC_CSP_HEADER],
            },
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
                source: '/campaigns/:id/dm/skill-trees',
                destination: '/campaigns/:id/dm/system/skill-trees',
                permanent: true,
            },
            {
                source: '/campaigns/:id/dm/artifacts/sets/new',
                destination: '/campaigns/:id/dm/system/artifact-sets/new',
                permanent: false,
            },
            {
                source: '/campaigns/:id/dm/artifacts/sets/:setId',
                destination: '/campaigns/:id/dm/system/artifact-sets/:setId',
                permanent: false,
            },
            {
                source: '/campaigns/:id/dm/artifacts/sets',
                destination: '/campaigns/:id/dm/system/artifact-sets',
                permanent: false,
            },
            {
                source: '/campaigns/:id/dm/artifact-sets/:rest*',
                destination: '/campaigns/:id/dm/system/artifact-sets/:rest*',
                permanent: true,
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
            ...storageImagePatterns(),
        ],
    },
};

export default withNextIntl(nextConfig);
