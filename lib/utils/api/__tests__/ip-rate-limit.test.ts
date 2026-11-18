import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    checkIpRateLimit,
    clientIp,
    ipRateLimitResponse,
    ipScopeOf,
} from '../ip-rate-limit';
import { IP_RATE_LIMITS } from '../rate-limit';

describe('ipScopeOf', () => {
    it('maps mcp and public paths, ignores the rest', () => {
        expect(ipScopeOf('/api/mcp')).toBe('mcp');
        expect(ipScopeOf('/api/mcp/sse')).toBe('mcp');
        expect(ipScopeOf('/api/health')).toBe('public');
        expect(ipScopeOf('/api/csp-report')).toBe('csp-report');
        expect(ipScopeOf('/api/campaigns')).toBeNull();
    });
});

describe('clientIp untrusted proxy', () => {
    it('uses a fixed bucket key outside Vercel without TRUST_PROXY', () => {
        vi.stubEnv('VERCEL', '');
        vi.stubEnv('TRUST_PROXY', '');

        expect(clientIp(new Headers({ 'x-real-ip': '3.3.3.3' }))).toBe(
            clientIp(new Headers({ 'x-real-ip': '4.4.4.4' }))
        );
        expect(clientIp(new Headers({ 'x-real-ip': '3.3.3.3' }))).not.toBe(
            '3.3.3.3'
        );

        vi.stubEnv('TRUST_PROXY', '1');

        expect(clientIp(new Headers({ 'x-real-ip': '3.3.3.3' }))).toBe(
            '3.3.3.3'
        );
    });
});

describe('clientIp', () => {
    beforeEach(() => {
        vi.stubEnv('VERCEL', '1');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('prefers x-real-ip, then the first x-forwarded-for hop', () => {
        expect(
            clientIp(new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }))
        ).toBe('1.1.1.1');
        expect(
            clientIp(
                new Headers({
                    'x-real-ip': '3.3.3.3',
                    'x-forwarded-for': '1.1.1.1',
                })
            )
        ).toBe('3.3.3.3');
        expect(clientIp(new Headers())).toBe('unknown');
    });
});

describe('checkIpRateLimit', () => {
    beforeEach(() => {
        vi.stubEnv('VERCEL', '1');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('blocks an IP after the window limit (memory fallback without Redis)', async () => {
        const headers = new Headers({ 'x-real-ip': '9.9.9.9' });

        let last = await checkIpRateLimit(headers, 'public');

        for (let i = 0; i < IP_RATE_LIMITS.public.limit; i++)
            last = await checkIpRateLimit(headers, 'public');

        expect(last.allowed).toBe(false);
        expect(ipRateLimitResponse(last).status).toBe(429);
    });
});
