import { describe, expect, it } from 'vitest';

import { caster } from './fixtures';

import { RulesetSchema } from '@/lib/utils/rules/schema';
import {
    dispelSpotsOf,
    dispelSpotsOfCast,
    isDispelRange,
} from '@/systems/wfrp/rules/magic/dispel-range';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleMapConfig } from '@/types/battle-grid';

const rules = RulesetSchema.parse(WFRP_RULES);

const map = { cols: 40, rows: 40 } as unknown as BattleMapConfig;

const at = (x: number, y: number) => {
    const p = caster();

    p.battleData.position = { x, y };

    return p;
};

describe('dispel range', () => {
    it('range is measured to the spell, not to its caster', () => {
        const dispeller = at(0, 0);

        const cast = { spell: 'Bolt', sl: 1, at: { x: 1, y: 0 } };

        const far = at(30, 0);

        expect(dispelSpotsOfCast(cast, far.battleData.position)).toEqual([
            { x: 1, y: 0 },
        ]);
        expect(
            isDispelRange(dispeller, dispelSpotsOfCast(cast), map, rules)
        ).toBe(true);
        expect(isDispelRange(dispeller, dispelSpotsOf(far), map, rules)).toBe(
            false
        );
    });

    it('falls back to the caster cell without a stored spot', () => {
        expect(
            dispelSpotsOfCast({ spell: 'Bolt', sl: 1 }, { x: 5, y: 5 })
        ).toEqual([{ x: 5, y: 5 }]);
        expect(dispelSpotsOfCast({ spell: 'Bolt', sl: 1 })).toEqual([]);
    });

    it('any of several target cells in range is enough', () => {
        const dispeller = at(0, 0);

        const spots = dispelSpotsOfCast({
            spell: 'Bolt',
            sl: 1,
            at: { x: 30, y: 0 },
            targets: [
                { x: 30, y: 0 },
                { x: 1, y: 0 },
            ],
        });

        expect(spots).toHaveLength(2);
        expect(isDispelRange(dispeller, spots, map, rules)).toBe(true);
        expect(
            isDispelRange(
                dispeller,
                [
                    { x: 30, y: 0 },
                    { x: 35, y: 0 },
                ],
                map,
                rules
            )
        ).toBe(false);
        expect(dispelSpotsOf(at(30, 0))).toEqual([{ x: 30, y: 0 }]);
    });
});
