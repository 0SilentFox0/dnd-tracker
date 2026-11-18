import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const auth = vi.hoisted(() => ({
    requireDM: vi.fn(),
    requireCampaignAccess: vi.fn(),
}));

vi.mock('@/lib/utils/api/api-auth', () => auth);

const svc = vi.hoisted(() => ({
    listMaps: vi.fn(),
    createMap: vi.fn(),
    getMap: vi.fn(),
    getMapMeta: vi.fn(),
    saveMap: vi.fn(),
    deleteMap: vi.fn(),
    cloneMap: vi.fn(),
    withStoredBackground: vi.fn(async (input: unknown) => input),
}));

vi.mock('@/lib/server/battle-maps/library-service', () => svc);

const access = vi.hoisted(() => ({ resolveMapReadVersion: vi.fn() }));

vi.mock('@/lib/server/battle-maps/player-access', () => access);

import { POST as clone } from '../[mapId]/clone/route';
import { DELETE, GET, PUT } from '../[mapId]/route';
import { GET as list, POST } from '../route';

const ctx = { params: Promise.resolve({ id: 'c1', mapId: 'm1' }) };

const full = {
    id: 'm1',
    name: 'Crypt',
    cols: 20,
    rows: 20,
    version: 2,
    updatedAt: 'x',
    campaignId: 'c1',
    map: {},
    header: { background: null },
    walls: [],
    bars: [],
};

const valid = {
    name: 'Crypt',
    map: { cols: 20, rows: 20, background: null, opacity: 0.5 },
    walls: ['0:0:e'],
};

const validSave = { ...valid, expectedVersion: 1 };

const send = (method: string, body?: unknown, headers?: HeadersInit, q = '') =>
    new Request(`http://x/maps${q}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

const forbidden = () => NextResponse.json({ error: 'x' }, { status: 403 });

beforeEach(() => {
    vi.clearAllMocks();
    auth.requireDM.mockResolvedValue({ userId: 'dm', isDM: true });
    auth.requireCampaignAccess.mockResolvedValue({ userId: 'p', isDM: false });
    access.resolveMapReadVersion.mockResolvedValue({ version: undefined });
    svc.getMap.mockResolvedValue(full);
    svc.getMapMeta.mockResolvedValue(full);
});

describe('maps routes', () => {
    it('GET list is DM-only', async () => {
        svc.listMaps.mockResolvedValue([]);

        expect((await list(send('GET'), ctx)).status).toBe(200);

        auth.requireDM.mockResolvedValue(forbidden());

        expect((await list(send('GET'), ctx)).status).toBe(403);
        expect(svc.listMaps).toHaveBeenCalledTimes(1);
    });

    it('GET one by a player without a battle on the map is 403', async () => {
        access.resolveMapReadVersion.mockResolvedValue(forbidden());

        expect((await GET(send('GET'), ctx)).status).toBe(403);
        expect(access.resolveMapReadVersion).toHaveBeenCalledWith(
            'c1',
            'm1',
            false,
            undefined,
            2
        );
        expect(svc.getMap).not.toHaveBeenCalled();
    });

    it('PUT without expectedVersion is 400', async () => {
        expect((await PUT(send('PUT', valid), ctx)).status).toBe(400);
        expect(svc.saveMap).not.toHaveBeenCalled();
    });

    it('POST at the library quota is 409 with the limit param', async () => {
        const { ContentError } = await import('@/lib/server/content/errors');

        svc.createMap.mockRejectedValueOnce(
            new ContentError('errors.battleMapLimit', 409, undefined, {
                max: 100,
            })
        );

        expect((await POST(send('POST', valid), ctx)).status).toBe(409);
    });

    it('GET one: 200 with ETag, 304 on match, 404, 403 for another campaign', async () => {
        const ok = await GET(send('GET'), ctx);

        expect(ok.status).toBe(200);
        expect(ok.headers.get('ETag')).toBe('W/"m1-2"');
        expect((await ok.json()).campaignId).toBeUndefined();

        const cached = await GET(
            send('GET', undefined, { 'if-none-match': 'W/"m1-2"' }),
            ctx
        );

        expect(cached.status).toBe(304);
        expect(svc.getMap).toHaveBeenCalledTimes(1);

        svc.getMapMeta.mockResolvedValue(null);
        expect((await GET(send('GET'), ctx)).status).toBe(404);

        svc.getMapMeta.mockResolvedValue({ ...full, campaignId: 'other' });
        expect((await GET(send('GET'), ctx)).status).toBe(403);
    });

    it('GET ?version=N is immutable and skips 304', async () => {
        const res = await GET(
            send(
                'GET',
                undefined,
                { 'if-none-match': 'W/"m1-2"' },
                '?version=1'
            ),
            ctx
        );

        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toContain('immutable');
        expect(svc.getMap).toHaveBeenCalledWith('m1', 1);
    });

    it('GET ?version=N of another campaign is 403 before any geometry is loaded', async () => {
        svc.getMapMeta.mockResolvedValue({ ...full, campaignId: 'other' });

        expect(
            (await GET(send('GET', undefined, undefined, '?version=1'), ctx))
                .status
        ).toBe(403);
        expect(svc.getMap).not.toHaveBeenCalled();
    });

    it('clone of another campaign is 403 before any geometry is loaded', async () => {
        svc.getMapMeta.mockResolvedValue({ ...full, campaignId: 'other' });

        expect((await clone(send('POST', {}), ctx)).status).toBe(403);
        expect(svc.getMap).not.toHaveBeenCalled();
    });

    it('PUT/DELETE of a map deleted meanwhile (P2025) is 404', async () => {
        const gone = new Prisma.PrismaClientKnownRequestError('x', {
            code: 'P2025',
            clientVersion: 'test',
        });

        svc.saveMap.mockRejectedValueOnce(gone);
        svc.deleteMap.mockRejectedValueOnce(gone);

        expect((await PUT(send('PUT', validSave), ctx)).status).toBe(404);
        expect((await DELETE(send('DELETE'), ctx)).status).toBe(404);
    });

    it('PUT passes expectedVersion through and maps a conflict to 409', async () => {
        const { ContentError } = await import('@/lib/server/content/errors');

        svc.saveMap.mockRejectedValueOnce(
            new ContentError('errors.battleMapConflict', 409)
        );

        const res = await PUT(
            send('PUT', { ...valid, expectedVersion: 2 }),
            ctx
        );

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe('errors.battleMapConflict');
        expect(svc.saveMap).toHaveBeenCalledWith(
            'm1',
            expect.objectContaining({ expectedVersion: 2 })
        );
    });

    it('GET rejects a bad version', async () => {
        expect(
            (await GET(send('GET', undefined, undefined, '?version=abc'), ctx))
                .status
        ).toBe(400);
    });

    it('writes are DM-only', async () => {
        auth.requireDM.mockResolvedValue(forbidden());

        expect((await POST(send('POST', valid), ctx)).status).toBe(403);
        expect((await PUT(send('PUT', validSave), ctx)).status).toBe(403);
        expect((await DELETE(send('DELETE'), ctx)).status).toBe(403);
        expect((await clone(send('POST', {}), ctx)).status).toBe(403);
        expect(svc.createMap).not.toHaveBeenCalled();
    });

    it('POST creates, PUT saves, invalid body is 400', async () => {
        svc.createMap.mockResolvedValue({ id: 'm1' });
        svc.saveMap.mockResolvedValue({ id: 'm1', version: 3 });

        expect((await POST(send('POST', valid), ctx)).status).toBe(201);
        expect((await PUT(send('PUT', validSave), ctx)).status).toBe(200);

        const dataUrl = {
            ...valid,
            map: { ...valid.map, background: 'data:image/png;base64,AAAA' },
        };

        expect((await POST(send('POST', dataUrl), ctx)).status).toBe(201);

        const badBackground = {
            ...valid,
            map: { ...valid.map, background: 'javascript:alert(1)' },
        };

        expect((await POST(send('POST', badBackground), ctx)).status).toBe(400);

        const tooBig = {
            ...valid,
            map: { ...valid.map, cols: 201, background: 'https://x/y.png' },
        };

        expect((await POST(send('POST', tooBig), ctx)).status).toBe(400);

        const outside = { ...validSave, walls: ['25:0:e'] };

        expect((await PUT(send('PUT', outside), ctx)).status).toBe(400);
    });

    it('DELETE: 409 when a battle uses the map', async () => {
        svc.deleteMap.mockResolvedValue('in-use');

        expect((await DELETE(send('DELETE'), ctx)).status).toBe(409);

        svc.deleteMap.mockResolvedValue('ok');

        expect((await DELETE(send('DELETE'), ctx)).status).toBe(200);
    });

    it('clone 201', async () => {
        svc.cloneMap.mockResolvedValue({ id: 'm2' });

        expect((await clone(send('POST', {}), ctx)).status).toBe(201);
    });
});
