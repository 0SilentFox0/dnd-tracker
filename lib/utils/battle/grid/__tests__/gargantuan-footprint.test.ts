import { describe, expect, it } from 'vitest';

import { cellsOf, sizeOf } from '../occupancy';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';

describe('gargantuan footprint', () => {
    it('a size-4 token covers 16 cells and size is capped at 4', () => {
        const p = makeParticipant({ id: 'g' });

        const g = {
            ...p,
            combatStats: { ...p.combatStats, gridSize: 4 },
            battleData: { ...p.battleData, position: { x: 2, y: 3 } },
        };

        expect(sizeOf(g)).toBe(4);
        expect(cellsOf(g)).toHaveLength(16);
        expect(
            sizeOf({ ...g, combatStats: { ...g.combatStats, gridSize: 9 } })
        ).toBe(4);
    });

    it('stored size 3 stays a 3x3 footprint', () => {
        const p = makeParticipant({ id: 'h' });

        const h = {
            ...p,
            combatStats: { ...p.combatStats, gridSize: 3 },
            battleData: { ...p.battleData, position: { x: 0, y: 0 } },
        };

        expect(cellsOf(h)).toHaveLength(9);
    });
});
