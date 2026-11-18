import { beforeEach, describe, expect, it, vi } from 'vitest';

const getClaims = vi.hoisted(() => vi.fn());

const db = vi.hoisted(() => ({
    campaign: { findUnique: vi.fn() },
    worldMap: { count: vi.fn() },
}));

const mocks = vi.hoisted(() => ({
    ticket: vi.fn(),
    reject: vi.fn(),
    publish: vi.fn(),
    balance: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
    unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ auth: { getClaims } }),
}));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/supabase/world-map-storage', () => ({
    createWorldMapUploadTicket: mocks.ticket,
    ownedWorldMapPath: vi.fn(),
    removeWorldMapFiles: vi.fn(),
}));
vi.mock('@/lib/server/assistant/proposals', () => ({
    rejectProposal: mocks.reject,
}));
vi.mock('@/lib/server/templates/publish-service', () => ({
    publishTemplate: mocks.publish,
}));
vi.mock('@/lib/server/battles/action-service', () => ({
    battleBalance: mocks.balance,
}));

import * as proposalReject from '@/app/api/campaigns/[id]/ai/proposals/[proposalId]/reject/route';
import * as balance from '@/app/api/campaigns/[id]/battles/balance/route';
import * as campaignSystem from '@/app/api/campaigns/[id]/system/[action]/route';
import * as templatePublish from '@/app/api/campaigns/[id]/template/publish/route';
import * as worldUpload from '@/app/api/campaigns/[id]/world/upload-url/route';
import { API_ERRORS } from '@/lib/constants/api-errors';

const json = (method: string, body?: unknown) =>
    new Request('http://x/api', {
        method,
        ...(body === undefined
            ? {}
            : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });

const ctx = <T extends Record<string, string>>(extra?: T) => ({
    params: Promise.resolve({ id: 'c1', ...extra } as { id: string } & T),
});

describe('campaign aux routes (DM session)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getClaims.mockResolvedValue({ data: { claims: { sub: 'dm' } } });
        db.campaign.findUnique.mockResolvedValue({
            id: 'c1',
            maxLevel: 20,
            kind: 'campaign',
            rules: { system: { key: 'homm' } },
            members: [{ userId: 'dm', role: 'dm' }],
        });
    });

    describe('POST world/upload-url', () => {
        it('rejects an unsupported content type with 400 and no ticket', async () => {
            const res = await worldUpload.POST(
                json('POST', { size: 100, contentType: 'image/gif' }),
                ctx()
            );

            expect(res.status).toBe(400);
            expect(await res.json()).toMatchObject({
                error: API_ERRORS.INVALID_BODY,
            });
            expect(mocks.ticket).not.toHaveBeenCalled();
        });

        it('rejects malformed JSON with 400', async () => {
            const res = await worldUpload.POST(json('POST', '{oops'), ctx());

            expect(res.status).toBe(400);
            expect(await res.json()).toMatchObject({
                error: API_ERRORS.INVALID_JSON,
            });
        });

        it('returns the ticket value for a valid request', async () => {
            mocks.ticket.mockResolvedValue({
                ok: true,
                value: { uploadUrl: 'u', publicUrl: 'p' },
            });

            const res = await worldUpload.POST(
                json('POST', { size: 100, contentType: 'image/webp' }),
                ctx()
            );

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({
                uploadUrl: 'u',
                publicUrl: 'p',
            });
            expect(mocks.ticket).toHaveBeenCalledWith('c1', 'image/webp');
        });

        it('maps a storage failure to 500 { error }', async () => {
            mocks.ticket.mockResolvedValue({ ok: false, message: 'boom' });

            const res = await worldUpload.POST(
                json('POST', { size: 100, contentType: 'image/webp' }),
                ctx()
            );

            expect(res.status).toBe(500);
            expect(await res.json()).toMatchObject({ error: 'boom' });
        });
    });

    describe('POST ai/proposals/:proposalId/reject', () => {
        it('returns the rejected row', async () => {
            mocks.reject.mockResolvedValue({ id: 'p1', status: 'REJECTED' });

            const res = await proposalReject.POST(
                json('POST', {}),
                ctx({ proposalId: 'p1' })
            );

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({ id: 'p1', status: 'REJECTED' });
            expect(mocks.reject).toHaveBeenCalledWith('c1', 'p1');
        });

        it('answers 409 when the proposal is already resolved or foreign', async () => {
            mocks.reject.mockResolvedValue(null);

            const res = await proposalReject.POST(
                json('POST', {}),
                ctx({ proposalId: 'p1' })
            );

            expect(res.status).toBe(409);
            expect(await res.json()).toMatchObject({
                error: API_ERRORS.AI_PROPOSAL_DONE,
            });
        });
    });

    describe('battles/balance', () => {
        it('POST with an invalid body is 400 and does not compute', async () => {
            const res = await balance.POST(
                json('POST', { xpDifficulty: 'impossible' }),
                ctx()
            );

            expect(res.status).toBe(400);
            expect(mocks.balance).not.toHaveBeenCalled();
        });

        it('GET passes the campaign rules to the service and returns its payload', async () => {
            mocks.balance.mockResolvedValue({ entities: [] });

            const res = await balance.GET(json('GET'), ctx());

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({ entities: [] });
            expect(mocks.balance).toHaveBeenCalledWith(
                'c1',
                undefined,
                expect.objectContaining({
                    system: expect.objectContaining({ key: 'homm' }),
                })
            );
        });
    });

    describe('POST template/publish', () => {
        it('returns the publish result for the DM actor', async () => {
            mocks.publish.mockResolvedValue({ version: 2, added: 1 });

            const res = await templatePublish.POST(
                json('POST', {}),
                ctx() as never
            );

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({ version: 2, added: 1 });
        });

        it('surfaces a service failure as { error }, not a stack', async () => {
            mocks.publish.mockRejectedValue(new Error('private SQL'));

            const res = await templatePublish.POST(
                json('POST', {}),
                ctx() as never
            );

            expect(res.status).toBe(500);
            expect(JSON.stringify(await res.json())).not.toContain(
                'private SQL'
            );
        });
    });

    describe('system/[action]', () => {
        it('unknown action is 404 SYSTEM_ACTION_UNKNOWN', async () => {
            const res = await campaignSystem.POST(
                json('POST', {}),
                ctx({ action: 'no-such-action' })
            );

            expect(res.status).toBe(404);
            expect(await res.json()).toMatchObject({
                error: API_ERRORS.SYSTEM_ACTION_UNKNOWN,
            });
        });

        it('prototype keys are not treated as actions', async () => {
            const res = await campaignSystem.GET(
                json('GET'),
                ctx({ action: 'constructor' })
            );

            expect(res.status).toBe(404);
        });
    });
});
