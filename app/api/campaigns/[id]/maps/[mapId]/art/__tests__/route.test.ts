import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const auth = vi.hoisted(() => ({ requireDM: vi.fn() }));

vi.mock('@/lib/utils/api/api-auth', () => auth);

const art = vi.hoisted(() => ({
    getArt: vi.fn(),
    saveArt: vi.fn(),
    deleteArt: vi.fn(),
}));

vi.mock('@/lib/server/battle-maps/art-service', () => art);

const library = vi.hoisted(() => ({
    getMapMeta: vi.fn(),
    withStoredBackground: vi.fn(),
}));

vi.mock('@/lib/server/battle-maps/library-service', () => library);

const limits = vi.hoisted(() => ({ campaignMapMaxSide: vi.fn() }));

vi.mock('@/lib/server/battle-maps/campaign-limits', () => limits);

import { DELETE, GET, PUT } from '../route';

import { ContentError } from '@/lib/server/content/errors';

const ctx = { params: Promise.resolve({ id: 'c1', mapId: 'm1' }) };

const meta = {
    campaignId: 'c1',
    version: 2,
    cols: 20,
    rows: 20,
    header: { cols: 20, rows: 20, background: null },
};

const scene = (over: Record<string, unknown> = {}) => ({
    v: 1,
    floors: {},
    walls: { '5:5:e': 'stone' },
    openings: {},
    blocked: {},
    lights: [],
    ambient: { tint: '#000000', darkness: 0 },
    stamps: [],
    ...over,
});

const payload = (over: Record<string, unknown> = {}) => ({
    save: {
        name: 'M',
        map: { cols: 20, rows: 20, background: null, opacity: 1 },
        walls: ['0:0:e'],
        bars: [],
        expectedVersion: 2,
    },
    scene: scene(),
    expectedSceneVersion: 0,
    ...over,
});

const request = (method: string, body?: unknown, headers: HeadersInit = {}) =>
    new Request('http://local/maps/m1/art', {
        method,
        headers:
            body === undefined
                ? headers
                : { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

beforeEach(() => {
    vi.clearAllMocks();
    auth.requireDM.mockResolvedValue({ isDM: true });
    limits.campaignMapMaxSide.mockResolvedValue(200);
    library.getMapMeta.mockResolvedValue(meta);
    library.withStoredBackground.mockImplementation(async (s: unknown) => s);
    art.getArt.mockResolvedValue({ scene: null, sceneVersion: 3 });
    art.saveArt.mockImplementation(async (_id: string, i: { save: { walls: string[] } }) => ({
        patch: { walls: i.save.walls },
    }));
});

describe('map art API', () => {
    it('rejects a player', async () => {
        auth.requireDM.mockResolvedValueOnce(
            NextResponse.json({}, { status: 403 })
        );

        expect((await GET(request('GET'), ctx)).status).toBe(403);
    });

    it('is forbidden when the map library flag is off', async () => {
        limits.campaignMapMaxSide.mockResolvedValueOnce(50);

        expect((await GET(request('GET'), ctx)).status).toBe(403);
        expect(art.getArt).not.toHaveBeenCalled();
    });

    it('404s a map that does not exist', async () => {
        library.getMapMeta.mockResolvedValueOnce(null);

        expect((await PUT(request('PUT', payload()), ctx)).status).toBe(404);
    });

    it('answers 304 for a matching If-None-Match', async () => {
        const first = await GET(request('GET'), ctx);

        const etag = first.headers.get('ETag') as string;

        const second = await GET(
            request('GET', undefined, { 'if-none-match': etag }),
            ctx
        );

        expect(second.status).toBe(304);
    });

    it('changes the ETag when the same scene is re-baked', async () => {
        const first = await GET(request('GET'), ctx);

        art.getArt.mockResolvedValueOnce({
            scene: null,
            sceneVersion: 3,
            bakedSceneVersion: 3,
            bakedUrl: 'https://cdn/b.webp',
            bakedAt: '2026-11-26T00:00:00.000Z',
        });

        const second = await GET(
            request('GET', undefined, {
                'if-none-match': first.headers.get('ETag') as string,
            }),
            ctx
        );

        expect(second.status).toBe(200);
    });

    it('rejects hex edge keys on a square map with issues', async () => {
        const res = await PUT(
            request('PUT', payload({ scene: scene({ walls: { '1:1:ne': 'stone' } }) })),
            ctx
        );

        expect(res.status).toBe(400);
        expect((await res.json()).issues).toBeDefined();
    });

    it('rejects a scene whose blocked cells cover the whole map', async () => {
        const blocked: Record<string, string | null> = {};

        for (let x = 0; x < 20; x++)
            for (let y = 0; y < 20; y++) blocked[`${x}:${y}`] = null;

        const res = await PUT(
            request('PUT', payload({ scene: scene({ blocked }) })),
            ctx
        );

        expect(res.status).toBe(400);
        expect(art.saveArt).not.toHaveBeenCalled();
    });

    it('returns 400 when the baked background fails verification', async () => {
        library.withStoredBackground.mockRejectedValueOnce(
            new ContentError('errors.battleMapBackgroundInvalid', 400)
        );

        const res = await PUT(
            request(
                'PUT',
                payload({ bakedUrl: 'https://cdn.test/baked.webp' })
            ),
            ctx
        );

        expect(res.status).toBe(400);
        expect(art.saveArt).not.toHaveBeenCalled();
    });

    it('saves and derives walls from the scene, not from save.walls', async () => {
        const res = await PUT(request('PUT', payload()), ctx);

        expect(res.status).toBe(200);

        const call = art.saveArt.mock.calls[0][1];

        expect(call.baked).toBe(false);
        expect(call.save.walls).toContain('5:5:e');
        expect(call.save.walls).not.toContain('0:0:e');
        expect((await res.json()).patch.walls).toContain('5:5:e');
    });

    it('deletes the art row', async () => {
        const res = await DELETE(request('DELETE'), ctx);

        expect(res.status).toBe(200);
        expect(art.deleteArt).toHaveBeenCalledWith('m1');
    });
});
