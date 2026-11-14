import { describe, expect, it } from 'vitest';

import { edgeBlocks } from '../edges';
import { cellKey } from '../geometry';
import { reachable } from '../path';

import { ParticipantSide } from '@/lib/constants/battle';
import { resolved } from '@/lib/utils/abilities/__tests__/fixtures';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import type {
    BattleMapConfig,
    BattleParticipant,
    GridPoint,
} from '@/types/battle';

function hero(position: GridPoint, gridSize = 1): BattleParticipant {
    const p = createMockParticipant();

    return {
        ...p,
        basicInfo: { ...p.basicInfo, id: 'h', side: ParticipantSide.ALLY },
        combatStats: { ...p.combatStats, gridSize },
        battleData: { ...p.battleData, position },
    };
}

const cost = (map: BattleMapConfig, p: BattleParticipant, budget = 10) =>
    reachable(map, [p], p, budget);

const key = (x: number, y: number) => cellKey({ x, y });

describe('стіни й ґрати в русі', () => {
    it('стіна блокує прямий крок, шлях в обхід довший', () => {
        const map = testMap(5, 3, { walls: ['1:0:e', '1:1:e'] });

        const result = cost(map, hero({ x: 1, y: 0 }));

        expect(result.get(key(2, 0))).toBe(5);
    });

    it('без стін той самий крок коштує 1', () => {
        const result = cost(testMap(5, 3), hero({ x: 1, y: 0 }));

        expect(result.get(key(2, 0))).toBe(1);
    });

    it('ґрати блокують рух', () => {
        const map = testMap(5, 1, { bars: ['1:0:e'] });

        const result = cost(map, hero({ x: 1, y: 0 }));

        expect(result.has(key(2, 0))).toBe(false);
    });

    it('діагональ через закритий кут заборонена', () => {
        const map = testMap(3, 3, { walls: ['0:0:e'] });

        const result = cost(map, hero({ x: 0, y: 0 }), 1);

        expect(result.has(key(1, 1))).toBe(false);
        expect(result.get(key(0, 1))).toBe(1);
    });

    it('footprint 2x2: стіна на краю будь-якої клітинки блокує крок', () => {
        const map = testMap(6, 4, { walls: ['1:1:e'] });

        const result = cost(map, hero({ x: 0, y: 0 }, 2), 1);

        expect(result.has(key(1, 0))).toBe(false);
        expect(result.get(key(0, 1))).toBe(1);
    });

    it('карта без стін не змінює результат пошуку', () => {
        const plain = testMap(4, 4);

        const withEmpty = testMap(4, 4, { walls: [], bars: [] });

        const a = cost(plain, hero({ x: 1, y: 1 }));

        const b = cost(withEmpty, hero({ x: 1, y: 1 }));

        expect([...b]).toEqual([...a]);
    });

    describe('passesWalls', () => {
        const ghost = (position: GridPoint): BattleParticipant => {
            const p = hero(position);

            return {
                ...p,
                battleData: {
                    ...p.battleData,
                    resolvedAbilities: [
                        resolved({
                            trigger: { event: 'passive' },
                            effects: [{ kind: 'flag', flag: 'passesWalls' }],
                        }),
                    ],
                },
            };
        };

        it('ефірний проходить стіни й ґрати, звичайний — ні', () => {
            const map = testMap(5, 3, {
                walls: ['1:0:e', '1:1:e'],
                bars: ['1:2:e'],
            });

            expect(cost(map, ghost({ x: 1, y: 0 })).get(key(2, 0))).toBe(1);
            expect(cost(map, ghost({ x: 1, y: 2 })).get(key(2, 2))).toBe(1);
            expect(cost(map, hero({ x: 1, y: 0 })).has(key(2, 0))).toBe(false);
        });

        it('зір і постріл не змінюються', () => {
            const map = testMap(5, 3, { walls: ['1:0:e'] });

            const a = { x: 1, y: 0 };

            const b = { x: 2, y: 0 };

            expect(edgeBlocks(map, a, b, 'move', ghost(a))).toBe(false);
            expect(edgeBlocks(map, a, b, 'sight', ghost(a))).toBe(true);
            expect(edgeBlocks(map, a, b, 'fire', ghost(a))).toBe(true);
        });
    });
});
