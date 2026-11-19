import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const resolveActor = vi.hoisted(() => vi.fn());

const copyContent = vi.hoisted(() => vi.fn());

const listCopyTargets = vi.hoisted(() => vi.fn());

const loadCopyNames = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/api/actor', () => ({ resolveActor }));
vi.mock('@/lib/server/systems/registry', () => ({}));
vi.mock('@/lib/server/content/copy/service', () => ({ copyContent }));
vi.mock('@/lib/server/content/copy/targets', () => ({ listCopyTargets }));
vi.mock('@/lib/server/content/copy/names', () => ({ loadCopyNames }));

vi.mock('@/lib/utils/api/translate-error', async (orig) => ({
    ...(await orig<object>()),
    requestTranslator: async () => ({
        has: (k: string) => k === 'errors.internal',
        raw: () => '',
        t: 0,
    }),
    translateErrorBody: (
        t: { has: (k: string) => boolean },
        b: { error: string }
    ) => ({ error: t.has(b.error) ? 'Внутрішня помилка сервера' : b.error }),
}));

import { GET, POST } from '../route';

const ctx = { params: Promise.resolve({ id: 'c1' }) };

const actor = { campaignId: 'c1', userId: 'u1', isDM: true, via: 'session' };

const post = (body: unknown) =>
    POST(
        new Request('http://x/api/campaigns/c1/content-copy', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
        ctx
    );

const get = (qs = '?kind=units') =>
    GET(new Request(`http://x/api/campaigns/c1/content-copy${qs}`), ctx);

const valid = {
    items: [{ kind: 'units', ids: ['a'] }],
    targets: { campaignIds: ['c2'] },
};

beforeEach(() => {
    vi.clearAllMocks();
    resolveActor.mockResolvedValue(actor);
});

describe('content-copy route', () => {
    it('translates per-target error keys', async () => {
        copyContent.mockResolvedValue({
            targets: [
                { campaignId: 'c2', status: 'failed', error: 'errors.internal' },
                { campaignId: 'c3', status: 'ok' },
            ],
        });

        const body = await (await post(valid)).json();

        expect(body.targets[0].error).toBe('Внутрішня помилка сервера');
        expect(body.targets[1].error).toBeUndefined();
    });

    it('returns the guard response when not allowed (POST)', async () => {
        resolveActor.mockResolvedValue(
            NextResponse.json({ error: 'x' }, { status: 403 })
        );

        expect((await post(valid)).status).toBe(403);
        expect(copyContent).not.toHaveBeenCalled();
    });

    it('returns the guard response when unauthenticated (GET)', async () => {
        resolveActor.mockResolvedValue(
            NextResponse.json({ error: 'x' }, { status: 401 })
        );

        expect((await get()).status).toBe(401);
    });

    it('400 on empty items', async () => {
        const res = await post({ ...valid, items: [] });

        expect(res.status).toBe(400);
        expect(copyContent).not.toHaveBeenCalled();
    });

    it('delegates to copyContent and returns the result', async () => {
        const result = { targets: [] };

        copyContent.mockResolvedValue(result);

        const res = await post({ ...valid, dryRun: true });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(result);
        expect(copyContent).toHaveBeenCalledWith({ actor, ...valid, dryRun: true });
    });

    it('GET returns source items and DM campaigns', async () => {
        loadCopyNames.mockResolvedValue([{ id: 'a', name: 'A' }]);
        listCopyTargets.mockResolvedValue([{ id: 'c2', name: 'Two' }]);

        const res = await get();

        expect(await res.json()).toEqual({
            items: [{ id: 'a', name: 'A' }],
            campaigns: [{ id: 'c2', name: 'Two' }],
        });
        expect(listCopyTargets).toHaveBeenCalledWith('u1', 'c1');
    });

    it('GET campaignsOnly skips item names', async () => {
        listCopyTargets.mockResolvedValue([{ id: 'c2', name: 'Two' }]);

        const res = await get('?campaignsOnly=1');

        expect(await res.json()).toEqual({
            campaigns: [{ id: 'c2', name: 'Two' }],
        });
        expect(loadCopyNames).not.toHaveBeenCalled();
    });

    it('GET requires a session actor', async () => {
        loadCopyNames.mockResolvedValue([]);
        listCopyTargets.mockResolvedValue([]);
        await get();

        expect(JSON.stringify(resolveActor.mock.calls[0])).toContain(
            '"sessionOnly":true'
        );
    });

    it('GET 400 on unknown kind', async () => {
        expect((await get('?kind=nope')).status).toBe(400);
    });
});
