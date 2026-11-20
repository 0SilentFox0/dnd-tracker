import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    MAX_WORLD_SESSIONS,
    WORLD_SESSION_COLORS,
} from '@/lib/constants/world';

const m = vi.hoisted(() => ({
    requireDM: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    del: vi.fn(),
    publish: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => {
    const worldSession = {
        count: m.count,
        updateMany: m.updateMany,
        create: m.create,
        findUnique: m.findUnique,
        findMany: m.findMany,
        update: m.update,
        delete: m.del,
    };

    return {
        prisma: {
            worldSession,
            $transaction: (fn: (tx: unknown) => unknown) =>
                fn({ worldSession }),
        },
    };
});
vi.mock('@/lib/utils/api/api-auth', () => ({ requireDM: m.requireDM }));
vi.mock('@/lib/server/world/world-events', () => ({
    publishWorldChanged: m.publish,
}));

import {
    sessionDeleteHandler,
    sessionPatchHandler,
    sessionsListHandler,
    sessionStartHandler,
} from '../session-handlers';

const row = (over: Record<string, unknown> = {}) => ({
    id: 's1',
    campaignId: 'c1',
    name: 'Night',
    description: null,
    color: '#fff',
    startedAt: new Date(0),
    endedAt: null,
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
    m.count.mockResolvedValue(0);
    m.create.mockImplementation(async ({ data }) => row(data));
});

describe('sessions', () => {
    it('lists sessions newest first', async () => {
        m.findMany.mockResolvedValue([row()]);

        const res = await sessionsListHandler('c1');

        expect(m.findMany.mock.calls[0][0].orderBy).toEqual({
            startedAt: 'desc',
        });
        expect((await res.json())[0]).toMatchObject({ id: 's1', active: true });
    });

    it('start closes the active session before creating and picks the next palette colour', async () => {
        m.count.mockResolvedValue(2);

        const res = await sessionStartHandler(req({ name: 'New' }), 'c1');

        expect(res.status).toBe(201);
        expect(m.updateMany).toHaveBeenCalledWith({
            where: { campaignId: 'c1', endedAt: null },
            data: { endedAt: expect.any(Date) },
        });
        expect(m.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
            m.create.mock.invocationCallOrder[0]
        );
        expect((await res.json()).color).toBe(WORLD_SESSION_COLORS[2]);
        expect(m.publish).toHaveBeenCalledWith('c1', null);
    });

    it('answers 409 when the unique active index rejects a concurrent start', async () => {
        m.create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('dup', {
                code: 'P2002',
                clientVersion: 'x',
            })
        );

        const res = await sessionStartHandler(req({ name: 'New' }), 'c1');

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(
            API_ERRORS.WORLD_SESSION_CONFLICT
        );
        expect(m.publish).not.toHaveBeenCalled();
    });

    it('refuses to start past the limit', async () => {
        m.count.mockResolvedValue(MAX_WORLD_SESSIONS);

        const res = await sessionStartHandler(req({ name: 'New' }), 'c1');

        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(API_ERRORS.WORLD_SESSION_LIMIT);
        expect(m.create).not.toHaveBeenCalled();
    });

    it('PATCH end sets endedAt', async () => {
        m.findUnique.mockResolvedValue(row());
        m.update.mockImplementation(async ({ data }) => row(data));

        const res = await sessionPatchHandler(req({ end: true }), 'c1', 's1');

        expect(m.update.mock.calls[0][0].data.endedAt).toBeInstanceOf(Date);
        expect((await res.json()).active).toBe(false);
    });

    it('PATCH rename does not end the session', async () => {
        m.findUnique.mockResolvedValue(row());
        m.update.mockImplementation(async ({ data }) => row(data));

        await sessionPatchHandler(req({ name: 'Renamed' }), 'c1', 's1');

        expect(m.update.mock.calls[0][0].data).toEqual({ name: 'Renamed' });
    });

    it('DELETE removes the session row only', async () => {
        m.findUnique.mockResolvedValue(row());

        const res = await sessionDeleteHandler('c1', 's1');

        expect(res.status).toBe(200);
        expect(m.del).toHaveBeenCalledWith({ where: { id: 's1' } });
        expect(m.publish).toHaveBeenCalledWith('c1', null);
    });

    it('rejects a session of another campaign and an unknown one', async () => {
        m.findUnique.mockResolvedValue(row({ campaignId: 'other' }));

        expect((await sessionDeleteHandler('c1', 's1')).status).toBe(403);

        m.findUnique.mockResolvedValue(null);

        const res = await sessionPatchHandler(req({ end: true }), 'c1', 's1');

        expect(res.status).toBe(404);
        expect((await res.json()).error).toBe(
            API_ERRORS.WORLD_SESSION_NOT_FOUND
        );
        expect(m.update).not.toHaveBeenCalled();
        expect(m.del).not.toHaveBeenCalled();
    });
});
