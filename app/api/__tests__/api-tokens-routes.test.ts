import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as tokenRotate from '@/app/api/campaigns/[id]/api-tokens/[tokenId]/rotate/route';
import * as tokenOne from '@/app/api/campaigns/[id]/api-tokens/[tokenId]/route';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import * as apiAuth from '@/lib/utils/api/api-auth';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/utils/api/api-auth', () => ({ requireDM: vi.fn() }));
vi.mock('@/lib/db', () => {
    const prisma: Record<string, unknown> = {
        apiToken: {
            updateMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
    };

    return { prisma };
});

const ctx = { params: Promise.resolve({ id: 'c1', tokenId: 't1' }) };

const req = (method: string) => new Request('http://x', { method });

const tokenRow = (over: Record<string, unknown> = {}) => ({
    id: 't1',
    name: 'CI',
    prefix: 'dndt_ab',
    scopes: ['content:read'],
    lastUsedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    expiresAt: null,
    ...over,
});

describe('api-token revoke / rotate routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(apiAuth.requireDM).mockResolvedValue({
            userId: 'dm',
            isDM: true,
            campaign: { id: 'c1', kind: 'campaign' },
        } as never);
    });

    it('DELETE revokes only the DM own live token of this campaign', async () => {
        vi.mocked(prisma.apiToken.updateMany).mockResolvedValue({
            count: 1,
        } as never);

        const res = await tokenOne.DELETE(req('DELETE'), ctx);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        expect(prisma.apiToken.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: 't1',
                    campaignId: 'c1',
                    userId: 'dm',
                    revokedAt: null,
                },
            })
        );
    });

    it('DELETE of a foreign, missing or already revoked token is 404', async () => {
        vi.mocked(prisma.apiToken.updateMany).mockResolvedValue({
            count: 0,
        } as never);

        const res = await tokenOne.DELETE(req('DELETE'), ctx);

        expect(res.status).toBe(404);
        expect(await res.json()).toMatchObject({
            error: API_ERRORS.API_TOKEN_NOT_FOUND,
        });
    });

    it('rotate of an unknown token is 404 and creates nothing', async () => {
        vi.mocked(prisma.apiToken.findFirst).mockResolvedValue(null as never);

        const res = await tokenRotate.POST(req('POST'), ctx);

        expect(res.status).toBe(404);
        expect(await res.json()).toMatchObject({
            error: API_ERRORS.API_TOKEN_NOT_FOUND,
        });
        expect(prisma.apiToken.create).not.toHaveBeenCalled();
    });

    it('rotate returns 201 with a fresh secret and the same scopes', async () => {
        vi.mocked(prisma.apiToken.findFirst).mockResolvedValue(
            tokenRow({ scopes: ['content:read', 'content:write'] }) as never
        );
        vi.mocked(prisma.apiToken.updateMany).mockResolvedValue({
            count: 1,
        } as never);
        vi.mocked(prisma.apiToken.create).mockImplementation((async ({
            data,
        }: {
            data: Record<string, unknown>;
        }) =>
            tokenRow({
                id: 't2',
                prefix: data.prefix,
                scopes: data.scopes,
            })) as never);

        const res = await tokenRotate.POST(req('POST'), ctx);

        expect(res.status).toBe(201);

        const body = await res.json();

        expect(body.id).toBe('t2');
        expect(body.scopes).toEqual(['content:read', 'content:write']);
        expect(String(body.token ?? body.secret)).toMatch(/^dndt_/);
    });

    it('rotate loses a race with a parallel rotate: 404, no new token', async () => {
        vi.mocked(prisma.apiToken.findFirst).mockResolvedValue(
            tokenRow() as never
        );
        vi.mocked(prisma.apiToken.updateMany).mockResolvedValue({
            count: 0,
        } as never);

        const res = await tokenRotate.POST(req('POST'), ctx);

        expect(res.status).toBe(404);
        expect(prisma.apiToken.create).not.toHaveBeenCalled();
    });
});
