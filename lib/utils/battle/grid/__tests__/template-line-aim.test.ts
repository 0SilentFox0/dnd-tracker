import { describe, expect, it } from 'vitest';

import { templateArea, templateCells } from '../template';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const map: BattleMapConfig = {
    cols: 40,
    rows: 40,
    background: null,
    opacity: 0.3,
};

const line = { shape: 'line' as const, size: 60 };

describe('line template aimed at a cell', () => {
    it('always includes the aim cell when it is within the line length', () => {
        const origin = { x: 20, y: 20 };

        const misses: string[] = [];

        for (let dy = -12; dy <= 12; dy++) {
            for (let dx = -12; dx <= 12; dx++) {
                if (!dx && !dy) continue;

                const cells = templateCells(
                    map,
                    line,
                    [origin],
                    { x: 20 + dx, y: 20 + dy },
                    DEFAULT_RULES
                );

                if (!cells.includes(`${20 + dx}:${20 + dy}`))
                    misses.push(`${dx},${dy}`);
            }
        }

        expect(misses).toEqual([]);
    });

    it('hits creatures on the aim cell and beyond it, not those off the line', () => {
        const mk = (id: string, x: number, y: number): BattleParticipant => {
            const b = createMockParticipant();

            return {
                ...b,
                basicInfo: { ...b.basicInfo, id },
                battleData: { ...b.battleData, position: { x, y } },
            };
        };

        const caster = mk('dragon', 5, 5);

        const ps = [
            caster,
            mk('fighter', 9, 5),
            mk('wizard', 13, 5),
            mk('off', 9, 6),
        ];

        const { targets } = templateArea(
            map,
            ps,
            caster,
            line,
            { x: 9, y: 5 },
            DEFAULT_RULES
        );

        expect(targets.map((t) => t.basicInfo.id)).toEqual([
            'fighter',
            'wizard',
        ]);
    });
});
