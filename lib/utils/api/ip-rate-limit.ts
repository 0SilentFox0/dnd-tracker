import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    checkRateLimit,
    IP_RATE_LIMITS,
    type RateLimitResult,
} from '@/lib/utils/api/rate-limit';

const MCP_PATH = '/api/mcp';

const PUBLIC_API_PATHS = [
    '/api/openapi.json',
    '/api/health',
    '/api/locale',
    '/api/theme',
];

const CSP_REPORT_PATH = '/api/csp-report';

// TRUST_PROXY=1 is required behind a self-hosted proxy, else every client shares one bucket
function trustsProxyHeaders(): boolean {
    return Boolean(process.env.VERCEL) || process.env.TRUST_PROXY === '1';
}

export function clientIp(headers: Headers): string {
    if (!trustsProxyHeaders()) return 'untrusted-proxy';

    const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();

    return headers.get('x-real-ip')?.trim() || forwarded || 'unknown';
}

type IpScope = 'mcp' | 'public' | 'csp-report';

export function ipScopeOf(pathname: string): IpScope | null {
    if (pathname === MCP_PATH || pathname.startsWith(`${MCP_PATH}/`))
        return 'mcp';

    if (pathname === CSP_REPORT_PATH) return 'csp-report';

    return PUBLIC_API_PATHS.includes(pathname) ? 'public' : null;
}

export async function checkIpRateLimit(
    headers: Headers,
    scope: IpScope
): Promise<RateLimitResult> {
    return checkRateLimit({
        userId: `ip:${clientIp(headers)}`,
        scope: `ip-${scope}`,
        ...IP_RATE_LIMITS[scope],
        memoryFallback: true,
    });
}

// proxy context: plain JSON with the error key, no request-locale lookup
export function ipRateLimitResponse(rl: RateLimitResult): NextResponse {
    return NextResponse.json(
        { error: API_ERRORS.TOO_MANY_REQUESTS },
        {
            status: 429,
            headers: { 'Retry-After': String(rl.retryAfterSeconds) },
        }
    );
}
