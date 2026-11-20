import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    access: vi.fn(),
    heroes: vi.fn(),
    scope: vi.fn(),
    logs: vi.fn(),
    chars: vi.fn(),
    show: vi.fn(),
    sessions: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        worldTravelLog: { findMany: m.logs },
        character: { findMany: m.chars },
        campaignShow: { findUnique: m.show },
    },
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: m.access,
}));
vi.mock('@/lib/server/world/travel-store', () => ({
    activePlayerHeroes: m.heroes,
}));
vi.mock('@/lib/server/world/view-handlers', () => ({
    readViewerScope: m.scope,
}));
vi.mock('@/lib/server/world/session-store', () => ({
    listSessions: m.sessions,
}));

import { trailHandler } from '../trail-handlers';

const session = (id: string) => ({
    id,
    name: `Session ${id}`,
    description: null,
    color: '#fff',
    startedAt: '',
    endedAt: null,
    active: false,
});

const log = (over: Record<string, unknown>) => ({
    id: 'l1',
    campaignId: 'c1',
    mapId: 'm1',
    characterIds: ['h1'],
    from: { mapId: 'm1', x: 0.1, y: 0.1 },
    to: { mapId: 'm1', x: 0.5, y: 0.5 },
    kind: 'travel',
    sessionId: null,
    createdAt: new Date(0),
    ...over,
});

const call = (mapId = 'm1') =>
    trailHandler(
        new Request(
            `http://localhost/api/campaigns/c1/world/trail?mapId=${mapId}`
        ),
        'c1'
    );

const asDM = () =>
    m.access.mockResolvedValue({ userId: 'u1', isDM: true, isDemo: false });

const asPlayer = () =>
    m.access.mockResolvedValue({ userId: 'u2', isDM: false, isDemo: false });

beforeEach(() => {
    vi.clearAllMocks();
    m.scope.mockResolvedValue({
        allMaps: [{ id: 'm1' }, { id: 'm2' }],
        allowed: new Set(['m1']),
    });
    m.show.mockResolvedValue(null);
    m.chars.mockResolvedValue([
        { id: 'h1', name: 'Aria' },
        { id: 'h2', name: 'Borin' },
    ]);
    m.sessions.mockResolvedValue([session('s1'), session('s2')]);
    m.logs.mockResolvedValue([]);
});

describe('trailHandler', () => {
    it('DM gets every session and every entry of the map in ascending order', async () => {
        asDM();
        m.logs.mockResolvedValue([
            log({ id: 'new', characterIds: ['h1', 'h2'], sessionId: 's1' }),
            log({ id: 'old', characterIds: ['h2'], sessionId: 's2' }),
        ]);

        const body = await (await call()).json();

        expect(m.logs.mock.calls[0][0]).toMatchObject({
            where: { campaignId: 'c1', mapId: 'm1' },
            orderBy: { createdAt: 'desc' },
            take: 500,
        });
        expect(body.sessions).toHaveLength(2);
        expect(body.entries.map((e: { id: string }) => e.id)).toEqual([
            'old',
            'new',
        ]);
        expect(body.entries[1].heroes).toHaveLength(2);
        expect(body.entries[1].from).toEqual({ x: 0.1, y: 0.1 });
    });

    it('DM from on another map or null yields only a node', async () => {
        asDM();
        m.logs.mockResolvedValue([
            log({ id: 'a', from: { mapId: 'm2', x: 0.9, y: 0.9 } }),
            log({ id: 'b', from: null }),
        ]);

        const { entries } = await (await call()).json();

        expect(entries.map((e: { from: unknown }) => e.from)).toEqual([
            null,
            null,
        ]);
    });

    it('player gets only own heroes; mixed entries lose from and foreign names', async () => {
        asPlayer();
        m.heroes.mockResolvedValue([
            { id: 'h1', name: 'Aria', avatar: null, controlledBy: 'u2' },
        ]);
        m.logs.mockResolvedValue([
            log({ id: 'solo', characterIds: ['h1'], sessionId: 's1' }),
            log({ id: 'mixed', characterIds: ['h1', 'h2'], sessionId: 's1' }),
        ]);

        const { entries } = await (await call()).json();

        expect(m.heroes).toHaveBeenCalledWith('c1', { controlledBy: 'u2' });
        expect(m.logs.mock.calls[0][0].where.characterIds).toEqual({
            hasSome: ['h1'],
        });
        expect(entries[0].from).toEqual({ x: 0.1, y: 0.1 });
        expect(entries[1].from).toBeNull();
        expect(JSON.stringify(entries)).not.toContain('Borin');
        expect(entries[1].heroes).toEqual([{ id: 'h1', name: 'Aria' }]);
    });

    it('player gets only sessions that have visible entries', async () => {
        asPlayer();
        m.heroes.mockResolvedValue([
            { id: 'h1', name: 'Aria', avatar: null, controlledBy: 'u2' },
        ]);
        m.logs.mockResolvedValue([
            log({ id: 'a', sessionId: 's1' }),
            log({ id: 'b', sessionId: null }),
        ]);

        const { sessions } = await (await call()).json();

        expect(sessions.map((s: { id: string }) => s.id)).toEqual(['s1']);
    });

    it('unknown map is 404 for both roles, same as the view', async () => {
        asPlayer();
        m.heroes.mockResolvedValue([{ id: 'h1', name: 'A' }]);

        expect((await call('nope')).status).toBe(404);
        expect((await call('m2')).status).toBe(404);

        asDM();

        expect((await call('nope')).status).toBe(404);
        expect(m.sessions).not.toHaveBeenCalled();
        expect(m.logs).not.toHaveBeenCalled();
    });

    it('a player without heroes and an empty map yield empty data', async () => {
        asPlayer();
        m.heroes.mockResolvedValue([]);

        expect(await (await call()).json()).toEqual({
            sessions: [],
            entries: [],
        });

        asDM();

        expect(await (await call()).json()).toEqual({
            sessions: [session('s1'), session('s2')],
            entries: [],
        });
    });
});
