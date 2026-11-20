import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    activeSessionId: vi.fn(),
    logCreate: vi.fn(),
    findReveals: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        worldPosition: { upsert: vi.fn((a) => a) },
        worldReveal: {
            findMany: m.findReveals,
            createMany: vi.fn((a) => a),
        },
        worldTravelLog: { create: m.logCreate },
        $transaction: vi.fn(async (ops: unknown[]) => ops),
    },
}));
vi.mock('@/lib/server/world/map-store', () => ({ listWorldMaps: vi.fn() }));
vi.mock('@/lib/server/world/session-store', () => ({
    activeSessionId: m.activeSessionId,
}));

import { commitTravel, writeRestLog } from '../travel-store';

const travelArgs = () => ({
    campaignId: 'c1',
    userId: 'u1',
    dest: { id: 'm1', revealRadius: 0.1, width: 100, height: 100 },
    plan: {
        moves: [{ characterId: 'h1', to: { x: 0.5, y: 0.5 } }],
        reveals: [],
    },
    positions: new Map(),
    rest: 'none' as const,
    toMarkerId: null,
    kind: 'travel' as const,
});

beforeEach(() => {
    vi.clearAllMocks();
    m.findReveals.mockResolvedValue([]);
});

describe('travel log session stamp', () => {
    it('commitTravel stamps the active session', async () => {
        m.activeSessionId.mockResolvedValue('s1');

        await commitTravel(travelArgs() as never);

        expect(m.logCreate.mock.calls[0][0].data.sessionId).toBe('s1');
    });

    it('commitTravel writes null without an active session', async () => {
        m.activeSessionId.mockResolvedValue(null);

        await commitTravel(travelArgs() as never);

        expect(m.logCreate.mock.calls[0][0].data.sessionId).toBeNull();
    });

    it('writeRestLog stamps the active session and null without one', async () => {
        const args = {
            campaignId: 'c1',
            userId: 'u1',
            mapId: 'm1',
            kind: 'short' as const,
            characterIds: ['h1'],
            at: { x: 0.1, y: 0.2 },
        };

        m.activeSessionId.mockResolvedValue('s2');
        await writeRestLog(args);
        m.activeSessionId.mockResolvedValue(null);
        await writeRestLog(args);

        expect(m.logCreate.mock.calls[0][0].data.sessionId).toBe('s2');
        expect(m.logCreate.mock.calls[1][0].data.sessionId).toBeNull();
    });
});
