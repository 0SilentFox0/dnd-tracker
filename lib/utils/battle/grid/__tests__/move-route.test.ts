import { describe, expect, it } from 'vitest';

import { hexCenter } from '../hex';
import { UNIT } from '../layout';
import { moveRoutes } from '../move-route';
import { pathTo } from '../path';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

const map: BattleMapConfig = {
    cols: 8,
    rows: 3,
    background: null,
    opacity: 0.3,
};

function at(position: GridPoint) {
    const p = createMockParticipant();

    return { ...p, battleData: { ...p.battleData, position } };
}

describe('moveRoutes', () => {
    it('дає центри клітинок від старої до нової', () => {
        const before = at({ x: 0, y: 0 });

        const after = at({ x: 3, y: 0 });

        const route = moveRoutes(map, [before], [after]).get(
            before.basicInfo.id
        );

        expect(route).toHaveLength(4);
        expect(route?.[0]?.cx).toBeLessThan(route?.[3]?.cx ?? 0);
    });

    it('hex: точки маршруту — hexCenter клітинок шляху, той самий шлях, що в pathTo', () => {
        const hex: BattleMapConfig = { ...map, gridType: 'hex' };

        const before = at({ x: 0, y: 0 });

        const after = at({ x: 3, y: 1 });

        const route = moveRoutes(hex, [before], [after]).get(
            before.basicInfo.id
        );

        const cells = pathTo(hex, [before], before, { x: 3, y: 1 }, 200) ?? [];

        const expected = [{ x: 0, y: 0 }, ...cells].map((c) => hexCenter(c));

        expect(cells.length).toBeGreaterThan(0);
        expect(route).toEqual(expected.map(({ x, y }) => ({ cx: x, cy: y })));
    });

    it('square: центри клітинок як раніше', () => {
        const before = at({ x: 0, y: 0 });

        const route = moveRoutes(map, [before], [at({ x: 2, y: 0 })]).get(
            before.basicInfo.id
        );

        expect(route).toEqual(
            [0.5, 1.5, 2.5].map((k) => ({ cx: k * UNIT, cy: 0.5 * UNIT }))
        );
    });

    it('без зміни клітинки маршруту немає', () => {
        const p = at({ x: 1, y: 1 });

        expect(moveRoutes(map, [p], [p]).size).toBe(0);
    });

    it('новий учасник не має маршруту', () => {
        expect(moveRoutes(map, [], [at({ x: 1, y: 1 })]).size).toBe(0);
    });
});
