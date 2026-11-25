import { describe, expect, it } from 'vitest';

import { caster } from '../../magic/__tests__/fixtures';
import { dispelRangeYards } from '../../magic/dispel';
import { isDispelRange } from '../../magic/dispel-range';
import { frenzyMoveAllowed, nearestFoes } from '../../traits/frenzy';
import { pointBlankBetween } from '../range-band';

import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const rules = RulesetSchema.parse(WFRP_RULES);

const square = { cols: 60, rows: 60 } as unknown as BattleMapConfig;

const hex = { ...square, gridType: 'hex' } as BattleMapConfig;

const FEET_PER_YARD = 3;

// (0,0) to (2m,2m) is 2m cells on a square grid and 3m on a hex grid
const diagonal = (cells: number) => {
    const m = Math.ceil((cells + 1) / 3);

    expect(2 * m).toBeLessThanOrEqual(cells);

    return { x: 2 * m, y: 2 * m };
};

const placed = (id: string, side: 'ally' | 'enemy', x: number, y: number) => {
    const p = caster();

    return {
        ...p,
        basicInfo: { ...p.basicInfo, id, side },
        battleData: { ...p.battleData, position: { x, y } },
    } as BattleParticipant;
};

describe('wfrp ranges on a hex grid', () => {
    it('point blank follows the hex distance', () => {
        const cells = Math.floor((4 * FEET_PER_YARD) / cellFeetOf(rules));

        const at = diagonal(cells);

        const a = placed('a', 'ally', 0, 0);

        const b = placed('b', 'enemy', at.x, at.y);

        expect(pointBlankBetween(a, b, rules, 'square')).toBe(true);
        expect(pointBlankBetween(a, b, rules, 'hex')).toBe(false);
    });

    it('dispel range follows the hex distance', () => {
        const dispeller = placed('d', 'ally', 0, 0);

        const cells = Math.floor(
            (dispelRangeYards(dispeller) * FEET_PER_YARD) / cellFeetOf(rules)
        );

        const spot = diagonal(cells);

        expect(isDispelRange(dispeller, spot, square, rules)).toBe(true);
        expect(isDispelRange(dispeller, spot, hex, rules)).toBe(false);
    });

    it('frenzy nearest foes tie on hex distance', () => {
        const me = placed('me', 'ally', 0, 0);

        const diag = placed('diag', 'enemy', 2, 2);

        const row = placed('row', 'enemy', 3, 0);

        const ps = [me, diag, row];

        const ids = (map: BattleMapConfig) =>
            nearestFoes(ps, me, map)
                .map((p) => p.basicInfo.id)
                .sort();

        expect(ids(square)).toEqual(['diag']);
        expect(ids(hex)).toEqual(['diag', 'row']);
    });

    it('a frenzied move is judged on hex distance', () => {
        const me = placed('me', 'ally', 3, 3);

        const foe = placed('foe', 'enemy', 6, 2);

        const moved = placed('me', 'ally', 4, 4);

        // 3 -> 2 cells on a square grid, 3 -> 3 on a hex grid
        expect(
            frenzyMoveAllowed([me, foe], moved, { x: 3, y: 3 }, square)
        ).toBe(true);
        expect(frenzyMoveAllowed([me, foe], moved, { x: 3, y: 3 }, hex)).toBe(
            false
        );
    });
});
