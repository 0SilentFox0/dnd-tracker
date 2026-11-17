import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/mcp/route';

const h = vi.hoisted(() => ({
    token: null as null | { scopes: string[] },
    allowed: true,
    handler: vi.fn(async () => new Response('{}')),
    createdOptions: null as null | { onEvent?: unknown },
}));

vi.mock('@/lib/ai/api-tokens', () => ({
    verifyApiToken: vi.fn(async () =>
        h.token
            ? {
                  id: 't1',
                  campaignId: 'c1',
                  userId: 'dm',
                  locale: 'en',
                  ...h.token,
              }
            : null
    ),
}));
vi.mock('@/lib/ai/mcp-request', () => ({
    boundMcpRequest: async (req: Request) => req,
}));
vi.mock('mcp-handler', () => ({
    createMcpHandler: (
        _init: unknown,
        options: NonNullable<typeof h.createdOptions>
    ) => {
        h.createdOptions = options;

        return h.handler;
    },
}));
vi.mock('@/lib/utils/api/rate-limit', () => ({
    checkRateLimit: async () => ({
        allowed: h.allowed,
        retryAfterSeconds: 7,
        limit: 1,
        count: 2,
    }),
    rateLimitResponse: () =>
        new Response(null, { status: 429, headers: { 'Retry-After': '7' } }),
}));

const request = (method: string, auth?: string) =>
    new Request('http://x/api/mcp', {
        method,
        headers: auth ? { authorization: auth } : {},
        ...(method === 'POST' ? { body: '{}' } : {}),
    });

describe('MCP route hygiene', () => {
    beforeEach(() => {
        h.token = { scopes: ['content:read'] };
        h.allowed = true;
        h.handler.mockClear();
        h.createdOptions = null;
    });

    it('401 carries WWW-Authenticate for a missing or unknown token', async () => {
        h.token = null;

        for (const auth of [undefined, 'Bearer dndt_bad']) {
            const res = await GET(request('GET', auth));

            expect(res.status).toBe(401);
            expect(res.headers.get('WWW-Authenticate')).toMatch(/^Bearer/);
        }
        expect(h.handler).not.toHaveBeenCalled();
    });

    it('403 for a token whose scopes expose no tools has no WWW-Authenticate', async () => {
        h.token = { scopes: [] };

        const res = await GET(request('GET', 'Bearer dndt_ok'));

        expect(res.status).toBe(403);
        expect(res.headers.get('WWW-Authenticate')).toBeNull();
    });

    it('429 on POST over the limit, handler is not reached', async () => {
        h.allowed = false;

        const res = await POST(request('POST', 'Bearer dndt_ok'));

        expect(res.status).toBe(429);
        expect(res.headers.get('Retry-After')).toBe('7');
        expect(h.handler).not.toHaveBeenCalled();
    });

    it('installs the audit logger bound to the token', async () => {
        await GET(request('GET', 'Bearer dndt_ok'));

        expect(h.createdOptions?.onEvent).toBeTypeOf('function');
    });
});
