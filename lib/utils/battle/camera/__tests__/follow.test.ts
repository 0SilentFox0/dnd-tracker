import { describe, expect, it } from 'vitest';

import { cellPointPx, followTarget } from '../follow';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { UNIT } from '@/lib/utils/battle/grid/layout';

const at = (id: string, position?: { x: number; y: number }, gridSize = 1) => {
    const p = createMockParticipant();

    return {
        ...p,
        basicInfo: { ...p.basicInfo, id },
        combatStats: { ...p.combatStats, gridSize },
        battleData: { ...p.battleData, position },
    };
};

describe('followTarget', () => {
    it('null без id, без учасника або без позиції', () => {
        expect(followTarget(null, [at('a', { x: 1, y: 1 })])).toBeNull();
        expect(followTarget('b', [at('a', { x: 1, y: 1 })])).toBeNull();
        expect(followTarget('a', [at('a')])).toBeNull();
    });

    it('позиція й розмір токена', () => {
        expect(followTarget('a', [at('a', { x: 2, y: 3 })])).toEqual({
            anchor: { x: 2, y: 3 },
            size: 1,
        });
        expect(followTarget('a', [at('a', { x: 2, y: 3 }, 2)])?.size).toBe(2);
    });
});

describe('cellPointPx', () => {
    it('центр клітинки з урахуванням вікна', () => {
        expect(cellPointPx({ x: 2, y: 1 }, 1, { x: 0, y: 0 }, 0.5)).toEqual({
            x: 2.5 * UNIT * 0.5,
            y: 1.5 * UNIT * 0.5,
        });
        expect(cellPointPx({ x: 5, y: 5 }, 1, { x: 4, y: 3 }, 1)).toEqual({
            x: 1.5 * UNIT,
            y: 2.5 * UNIT,
        });
    });

    it('токен 2×2 — центр на стику клітинок', () => {
        expect(cellPointPx({ x: 3, y: 3 }, 2, { x: 0, y: 0 }, 1)).toEqual({
            x: 4 * UNIT,
            y: 4 * UNIT,
        });
    });
});
