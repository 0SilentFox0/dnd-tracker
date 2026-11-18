import { describe, expect, it } from 'vitest';

import { moveRoutes } from '../move-route';

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

    it('без зміни клітинки маршруту немає', () => {
        const p = at({ x: 1, y: 1 });

        expect(moveRoutes(map, [p], [p]).size).toBe(0);
    });

    it('новий учасник не має маршруту', () => {
        expect(moveRoutes(map, [], [at({ x: 1, y: 1 })]).size).toBe(0);
    });
});
