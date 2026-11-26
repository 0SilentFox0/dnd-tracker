import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadBattleListCards } from '../list-cards';

const db = vi.hoisted(() => ({
    scenes: vi.fn(),
    raw: vi.fn(),
    characters: vi.fn(),
    units: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        battleScene: { findMany: db.scenes },
        character: { findMany: db.characters },
        unit: { findMany: db.units },
        $queryRaw: db.raw,
    },
}));

const date = new Date('2026-11-20T10:00:00.000Z');

const scene = (over: Record<string, unknown> = {}) => ({
    id: 'b1',
    name: 'Ambush',
    description: null,
    status: 'prepared',
    participants: [],
    currentRound: 1,
    createdAt: date,
    startedAt: null,
    completedAt: null,
    ...over,
});

const mapRow = (over: Record<string, unknown> = {}) => ({
    id: 'b1',
    bg: null,
    cols: 20,
    rows: 15,
    grid: 'square',
    maze: false,
    libBg: null,
    ...over,
});

const setup = (
    scenes: unknown[],
    maps: unknown[] = [],
    results: unknown[] = []
) => {
    db.scenes.mockResolvedValue(scenes);
    db.raw.mockResolvedValueOnce(maps).mockResolvedValueOnce(results);
};

beforeEach(() => {
    vi.resetAllMocks();
    db.characters.mockResolvedValue([]);
    db.units.mockResolvedValue([]);
});

describe('loadBattleListCards', () => {
    it('reads map fields from the battle JSON', async () => {
        setup(
            [scene()],
            [mapRow({ bg: '/battle-maps/a.webp', grid: 'hex', maze: true })]
        );

        const [card] = await loadBattleListCards('c1');

        expect(card.map).toEqual({
            background: '/battle-maps/a.webp',
            cols: 20,
            rows: 15,
            gridType: 'hex',
            maze: true,
        });
        expect(card.createdAt).toBe(date.toISOString());
    });

    it('falls back to the library map background', async () => {
        setup([scene()], [mapRow({ libBg: '/battle-maps/lib.png' })]);

        const [card] = await loadBattleListCards('c1');

        expect(card.map?.background).toBe('/battle-maps/lib.png');
    });

    it('drops an unsafe background', async () => {
        setup([scene()], [mapRow({ bg: 'https://evil.example/x.png' })]);

        const [card] = await loadBattleListCards('c1');

        expect(card.map?.background).toBeNull();
    });

    it('returns no map when the battle has none', async () => {
        setup([scene()], []);

        const [card] = await loadBattleListCards('c1');

        expect(card.map).toBeNull();
    });

    it('counts quantity and caps faces at five', async () => {
        const units = Array.from({ length: 7 }, (_, i) => ({
            id: `u${i}`,
            name: `U${i}`,
            avatar: null,
        }));

        db.units.mockResolvedValue(units);
        setup([
            scene({
                participants: [
                    ...units.map((u) => ({
                        id: u.id,
                        type: 'unit',
                        side: 'enemy',
                        quantity: 2,
                    })),
                    { id: 'h1', type: 'character', side: 'ally' },
                ],
            }),
        ]);

        const [card] = await loadBattleListCards('c1');

        expect(card.sides.enemy.count).toBe(14);
        expect(card.sides.enemy.faces).toHaveLength(5);
        expect(card.sides.ally.count).toBe(1);
    });

    it('skips a deleted entity in faces but still counts it', async () => {
        db.characters.mockResolvedValue([
            { id: 'h1', name: 'Hero', avatar: null },
        ]);
        setup([
            scene({
                participants: [
                    { id: 'h1', type: 'character', side: 'ally' },
                    { id: 'gone', type: 'character', side: 'ally' },
                ],
            }),
        ]);

        const [card] = await loadBattleListCards('c1');

        expect(card.sides.ally.count).toBe(2);
        expect(card.sides.ally.faces.map((f) => f.id)).toEqual(['h1']);
    });

    it('takes the result of a completed battle from its events', async () => {
        setup(
            [scene({ status: 'completed' }), scene({ id: 'b2' })],
            [],
            [{ battleId: 'b1', result: 'victory' }]
        );

        const cards = await loadBattleListCards('c1');

        expect(cards[0].result).toBe('victory');
        expect(cards[1].result).toBeNull();
    });

    it('skips the result query without completed battles', async () => {
        setup([scene()]);

        await loadBattleListCards('c1');

        expect(db.raw).toHaveBeenCalledTimes(1);
    });
});
