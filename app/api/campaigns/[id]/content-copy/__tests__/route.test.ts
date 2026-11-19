import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const resolveActor = vi.hoisted(() => vi.fn());

const copyContent = vi.hoisted(() => vi.fn());

const listCopyTargets = vi.hoisted(() => vi.fn());

const loadNames = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/api/actor', () => ({ resolveActor }));
vi.mock('@/lib/server/systems/registry', () => ({}));
vi.mock('@/lib/server/content/copy/service', () => ({ copyContent }));
vi.mock('@/lib/server/content/copy/targets', () => ({ listCopyTargets }));
vi.mock('@/lib/server/content/import/names', () => ({ loadNames }));

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
        loadNames.mockResolvedValue([{ id: 'a', name: 'A', slug: 's' }]);
        listCopyTargets.mockResolvedValue([{ id: 'c2', name: 'Two' }]);

        const res = await get();

        expect(await res.json()).toEqual({
            items: [{ id: 'a', name: 'A' }],
            campaigns: [{ id: 'c2', name: 'Two' }],
        });
        expect(listCopyTargets).toHaveBeenCalledWith('u1', 'c1');
    });

    it('GET 400 on unknown kind', async () => {
        expect((await get('?kind=nope')).status).toBe(400);
    });
});
