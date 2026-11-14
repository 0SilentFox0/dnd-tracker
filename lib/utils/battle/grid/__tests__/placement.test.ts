import { describe, expect, it } from 'vitest';

import { cellDistance } from '../geometry';
import { placeParticipants } from '../placement';

import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import type {
    BattleMapConfig,
    BattleParticipant,
    GridPoint,
} from '@/types/battle';

const map: BattleMapConfig = {
    cols: 10,
    rows: 5,
    background: null,
    opacity: 0.3,
};

function p(
    id: string,
    side: string,
    battleData: Partial<BattleParticipant['battleData']> = {},
    gridSize?: number
): BattleParticipant {
    const b = createMockParticipant();

    return {
        ...b,
        basicInfo: {
            ...b.basicInfo,
            id,
            side: side as BattleParticipant['basicInfo']['side'],
        },
        combatStats: { ...b.combatStats, ...(gridSize && { gridSize }) },
        battleData: { ...b.battleData, ...battleData },
    };
}

describe('авторозстановка', () => {
    it('союзники ліворуч, вороги праворуч, без перекриттів', () => {
        const out = placeParticipants(map, [
            p('a1', ParticipantSide.ALLY),
            p('a2', ParticipantSide.ALLY),
            p('e1', ParticipantSide.ENEMY, {}, 2),
        ]);

        const [a1, a2, e1] = out.map((x) => x.battleData.position as GridPoint);

        expect(a1.x).toBe(0);
        expect(a2.x).toBe(0);
        expect(a1.y).not.toBe(a2.y);
        expect(e1.x).toBe(8);
    });

    it('одного боку розставляє через рядок, а коли місця мало — заповнює проміжки', () => {
        const tall: BattleMapConfig = {
            cols: 1,
            rows: 5,
            background: null,
            opacity: 0.3,
        };

        const rowsOf = (n: number) =>
            placeParticipants(
                tall,
                Array.from({ length: n }, (_, i) =>
                    p(`a${i}`, ParticipantSide.ALLY)
                )
            ).map((x) => (x.battleData.position as GridPoint).y);

        const three = rowsOf(3).sort();

        expect(three.every((y, i) => i === 0 || y - three[i - 1] >= 2)).toBe(
            true
        );
        expect(new Set(rowsOf(5)).size).toBe(5);
    });

    it('вже розставлених і резерв не чіпає', () => {
        const placed = p('a1', ParticipantSide.ALLY, {
            position: { x: 4, y: 4 },
        });

        const reserve = p('r', ParticipantSide.ENEMY, { reserved: true });

        const out = placeParticipants(map, [placed, reserve]);

        expect(out[0]).toBe(placed);
        expect(out[1].battleData.position).toBeUndefined();
    });

    it('призваний стає поруч із призивачем', () => {
        const summoner = p('s', ParticipantSide.ALLY, {
            position: { x: 5, y: 2 },
        });

        const out = placeParticipants(map, [
            summoner,
            p('wolf', ParticipantSide.ALLY, { summonedBy: 's' }),
        ]);

        expect(
            cellDistance(out[1].battleData.position as GridPoint, {
                x: 5,
                y: 2,
            })
        ).toBe(1);
    });

    it('непритомний і мертвий клітинку не займають', () => {
        const down = {
            ...p('d', ParticipantSide.ALLY, { position: { x: 0, y: 2 } }),
            combatStats: {
                ...p('x', 'ally').combatStats,
                status: CombatStatus.UNCONSCIOUS,
                currentHp: 0,
            },
        };

        const dead = {
            ...p('k', ParticipantSide.ALLY, { position: { x: 0, y: 1 } }),
            combatStats: {
                ...p('x', 'ally').combatStats,
                status: CombatStatus.DEAD,
                currentHp: 0,
            },
        };

        const out = placeParticipants(map, [
            down,
            dead,
            p('n1', ParticipantSide.ALLY, { position: { x: 0, y: 1 } }),
            p('n2', ParticipantSide.ALLY, { position: { x: 0, y: 2 } }),
        ]);

        expect(out[2].battleData.position).toEqual({ x: 0, y: 1 });
        expect(out[3].battleData.position).toEqual({ x: 0, y: 2 });
    });

    it('позиція поза картою після зменшення — розставляється заново поблизу', () => {
        const out = placeParticipants(map, [
            p('a', ParticipantSide.ALLY, { position: { x: 14, y: 2 } }),
        ]);

        const pos = out[0].battleData.position as GridPoint;

        expect(pos.x).toBe(9);
        expect(pos.y).toBeLessThan(map.rows);
    });

    it('перекриття після воскресіння — пізніший зсувається', () => {
        const first = p('a', ParticipantSide.ALLY, {
            position: { x: 3, y: 2 },
        });

        const second = p('b', ParticipantSide.ALLY, {
            position: { x: 3, y: 2 },
        });

        const out = placeParticipants(map, [first, second]);

        expect(out[0]).toBe(first);
        expect(
            cellDistance(out[1].battleData.position as GridPoint, {
                x: 3,
                y: 2,
            })
        ).toBe(1);
    });

    it('8 союзників на 20×12: жодних двох поруч по вертикалі, колонки заповнюються шахівницею', () => {
        const wide: BattleMapConfig = {
            cols: 20,
            rows: 12,
            background: null,
            opacity: 0.3,
        };

        const out = placeParticipants(
            wide,
            Array.from({ length: 8 }, (_, i) =>
                p(`a${i}`, ParticipantSide.ALLY)
            )
        );

        const cells = out.map((x) => x.battleData.position as GridPoint);

        for (const a of cells)
            expect(
                cells.some((b) => b.x === a.x && Math.abs(b.y - a.y) === 1)
            ).toBe(false);

        expect(new Set(cells.map((c) => c.x)).size).toBeGreaterThan(1);
        expect(new Set(cells.map((c) => `${c.x}:${c.y}`)).size).toBe(8);
    });
});

describe('золотий порядок розстановки', () => {
    const cfg = (cols: number, rows: number): BattleMapConfig => ({
        cols,
        rows,
        background: null,
        opacity: 0.3,
    });

    const A = ParticipantSide.ALLY;

    const E = ParticipantSide.ENEMY;

    const positions = (m: BattleMapConfig, list: BattleParticipant[]) =>
        placeParticipants(m, list).map((x) => x.battleData.position);

    it('змішані сторони й великі істоти', () => {
        expect(
            positions(cfg(10, 5), [
                p('a1', A),
                p('a2', A),
                p('e1', E, {}, 2),
                p('e2', E),
                p('a3', A, {}, 2),
            ])
        ).toEqual([
            { x: 0, y: 2 },
            { x: 0, y: 0 },
            { x: 8, y: 2 },
            { x: 9, y: 0 },
            { x: 1, y: 1 },
        ]);
    });

    it('призвані, перекриття й позиція поза картою', () => {
        expect(
            positions(cfg(10, 5), [
                p('s', A, { position: { x: 5, y: 2 } }),
                p('w1', A, { summonedBy: 's' }),
                p('w2', A, { summonedBy: 's' }),
                p('o1', E, { position: { x: 9, y: 4 } }),
                p('o2', E, { position: { x: 9, y: 4 } }),
                p('out', A, { position: { x: 14, y: 2 } }),
            ])
        ).toEqual([
            { x: 5, y: 2 },
            { x: 4, y: 1 },
            { x: 5, y: 1 },
            { x: 9, y: 4 },
            { x: 8, y: 3 },
            { x: 9, y: 0 },
        ]);
    });

    it('20×12: 8 союзників і 8 ворогів, один великий', () => {
        expect(
            positions(cfg(20, 12), [
                ...Array.from({ length: 8 }, (_, i) => p(`a${i}`, A)),
                ...Array.from({ length: 8 }, (_, i) =>
                    p(`e${i}`, E, {}, i === 0 ? 3 : 1)
                ),
            ])
        ).toEqual([
            { x: 0, y: 5 },
            { x: 0, y: 7 },
            { x: 0, y: 3 },
            { x: 0, y: 9 },
            { x: 0, y: 1 },
            { x: 0, y: 11 },
            { x: 1, y: 6 },
            { x: 1, y: 4 },
            { x: 17, y: 5 },
            { x: 19, y: 3 },
            { x: 19, y: 9 },
            { x: 19, y: 1 },
            { x: 19, y: 11 },
            { x: 18, y: 4 },
            { x: 18, y: 8 },
            { x: 18, y: 2 },
        ]);
    });
});
