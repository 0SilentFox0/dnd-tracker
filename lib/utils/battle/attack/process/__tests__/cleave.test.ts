import { describe, expect, it } from 'vitest';

import { cleaveTargets } from '../cleave';

import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import { placed, testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import type { GridPoint } from '@/types/battle';

const MAP = testMap();

const at = (
    id: string,
    pos: GridPoint,
    side: ParticipantSide = ParticipantSide.ENEMY
) => placed(id, { side, at: pos, hp: 20 });

const cerberus = at('c', { x: 5, y: 5 }, ParticipantSide.ALLY);

const target = at('t', { x: 6, y: 5 });

const ids = (ps: { basicInfo: { id: string } }[]) =>
    ps.map((p) => p.basicInfo.id);

describe('cleaveTargets', () => {
    it('напрямок: 3 клітинки; обирається той, що дає найбільше цілей', () => {
        const c = at('c', { x: 1, y: 1 }, ParticipantSide.ALLY);

        const hits = (cells: [number, number][], primary: number) => {
            const es = cells.map(([x, y], i) => at(`e${i}`, { x, y }));

            return ids(cleaveTargets(MAP, [c, ...es], c, es[primary], 2));
        };

        expect(
            hits(
                [
                    [0, 0],
                    [2, 1],
                ],
                0
            )
        ).toEqual([]);
        expect(
            hits(
                [
                    [0, 0],
                    [2, 0],
                ],
                0
            )
        ).toEqual(['e1']);
        expect(
            hits(
                [
                    [0, 0],
                    [1, 0],
                    [2, 0],
                ],
                1
            )
        ).toEqual(['e0', 'e2']);
        expect(
            hits(
                [
                    [1, 0],
                    [2, 0],
                    [2, 1],
                ],
                1
            )
        ).toEqual(['e0', 'e2']);
        expect(
            hits(
                [
                    [1, 0],
                    [1, 2],
                ],
                0
            )
        ).toEqual([]);
    });

    it('не бере союзників, далеких і повалених', () => {
        const fallen = at('down', { x: 6, y: 6 });

        const order = [
            cerberus,
            target,
            at('ally', { x: 6, y: 4 }, ParticipantSide.ALLY),
            at('far', { x: 8, y: 5 }),
            {
                ...fallen,
                combatStats: {
                    ...fallen.combatStats,
                    currentHp: 0,
                    status: CombatStatus.UNCONSCIOUS,
                },
            },
        ];

        expect(cleaveTargets(MAP, order, cerberus, target, 2)).toEqual([]);
    });

    it('без карти — порожньо', () => {
        expect(
            cleaveTargets(
                null,
                [cerberus, target, at('a', { x: 6, y: 4 })],
                cerberus,
                target,
                2
            )
        ).toEqual([]);
    });
});
