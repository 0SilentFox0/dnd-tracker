import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_WORLD_ENEMY_PINS } from '@/lib/constants/world';

const m = vi.hoisted(() => ({
    requireDM: vi.fn(),
    ownedMap: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    del: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        worldEnemyPin: {
            count: m.count,
            create: m.create,
            findUnique: m.findUnique,
            update: m.update,
            delete: m.del,
        },
    },
}));
vi.mock('@/lib/utils/api/api-auth', () => ({ requireDM: m.requireDM }));
vi.mock('@/lib/server/world/map-handlers', () => ({ ownedMap: m.ownedMap }));

import {
    enemyCreateHandler,
    enemyDeleteHandler,
    enemyPatchHandler,
} from '../enemy-handlers';

const row = (over: Record<string, unknown> = {}) => ({
    id: 'e1',
    mapId: 'm1',
    name: 'Ogre',
    icon: null,
    color: null,
    dmNote: null,
    x: 0.2,
    y: 0.3,
    ...over,
});

const req = (body: unknown) =>
    new Request('http://localhost/x', {
        method: 'POST',
        body: JSON.stringify(body),
    });

beforeEach(() => {
    vi.clearAllMocks();
    m.requireDM.mockResolvedValue({ userId: 'u1', isDM: true });
    m.ownedMap.mockResolvedValue({ id: 'm1', campaignId: 'c1' });
    m.count.mockResolvedValue(0);
    m.create.mockImplementation(async ({ data }) => row(data));
    m.update.mockImplementation(async ({ data }) => row(data));
});

describe('enemy pins', () => {
    it('creates an enemy on the map', async () => {
        const res = await enemyCreateHandler(
            req({ name: 'Ogre', x: 0.2, y: 0.3 }),
            'c1',
            'm1'
        );

        expect(res.status).toBe(201);
        expect(m.create.mock.calls[0][0].data).toMatchObject({
            mapId: 'm1',
            name: 'Ogre',
        });
        expect(await res.json()).toMatchObject({ id: 'e1', mapId: 'm1' });
    });

    it('refuses past the per-map limit with 409', async () => {
        m.count.mockResolvedValue(MAX_WORLD_ENEMY_PINS);

        const res = await enemyCreateHandler(
            req({ name: 'Ogre', x: 0.2, y: 0.3 }),
            'c1',
            'm1'
        );

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(API_ERRORS.WORLD_ENEMY_LIMIT);
        expect(m.create).not.toHaveBeenCalled();
    });

    it.each([
        { name: 'Ogre', x: 1.5, y: 0.3 },
        { name: 'Ogre', x: 0.2, y: -0.1 },
    ])('rejects coordinates outside 0..1 (%o)', async (body) => {
        const res = await enemyCreateHandler(req(body), 'c1', 'm1');

        expect(res.status).toBe(400);
        expect(m.create).not.toHaveBeenCalled();
    });

    it('rejects out-of-range coordinates on patch', async () => {
        const res = await enemyPatchHandler(req({ x: 2 }), 'c1', 'm1', 'e1');

        expect(res.status).toBe(400);
        expect(m.update).not.toHaveBeenCalled();
    });

    it('passes through the map ownership error', async () => {
        m.ownedMap.mockResolvedValue(
            NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
        );

        const res = await enemyCreateHandler(
            req({ name: 'Ogre', x: 0.2, y: 0.3 }),
            'c1',
            'other'
        );

        expect(res.status).toBe(403);
        expect(m.create).not.toHaveBeenCalled();
    });

    it('patches an enemy of the map', async () => {
        m.findUnique.mockResolvedValue(row());

        const res = await enemyPatchHandler(
            req({ x: 0.9 }),
            'c1',
            'm1',
            'e1'
        );

        expect(res.status).toBe(200);
        expect(m.update.mock.calls[0][0]).toMatchObject({
            where: { id: 'e1' },
            data: { x: 0.9 },
        });
    });

    it('answers 404 for an enemy of another map', async () => {
        m.findUnique.mockResolvedValue(row({ mapId: 'm2' }));

        const patch = await enemyPatchHandler(req({ x: 0.9 }), 'c1', 'm1', 'e1');
        const del = await enemyDeleteHandler('c1', 'm1', 'e1');

        for (const res of [patch, del]) {
            expect(res.status).toBe(404);
            expect((await res.json()).error).toBe(
                API_ERRORS.WORLD_ENEMY_NOT_FOUND
            );
        }

        expect(m.update).not.toHaveBeenCalled();
        expect(m.del).not.toHaveBeenCalled();
    });

    it('answers 404 for a missing enemy', async () => {
        m.findUnique.mockResolvedValue(null);

        const res = await enemyDeleteHandler('c1', 'm1', 'nope');

        expect(res.status).toBe(404);
    });

    it('deletes an enemy of the map', async () => {
        m.findUnique.mockResolvedValue(row());

        const res = await enemyDeleteHandler('c1', 'm1', 'e1');

        expect(await res.json()).toEqual({ ok: true });
        expect(m.del).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });

    it('refuses non-DM callers', async () => {
        m.requireDM.mockResolvedValue(
            NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
        );

        const res = await enemyDeleteHandler('c1', 'm1', 'e1');

        expect(res.status).toBe(403);
        expect(m.del).not.toHaveBeenCalled();
    });
});
