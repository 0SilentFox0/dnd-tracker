import { describe, expect, it } from 'vitest';

import { caster } from './fixtures';

import { RulesetSchema } from '@/lib/utils/rules/schema';
import {
    dispelSpotOf,
    isDispelRange,
} from '@/systems/wfrp/rules/magic/dispel-range';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleMapConfig } from '@/types/battle-grid';

const rules = RulesetSchema.parse(WFRP_RULES);

const map = { cols: 40, rows: 40 } as unknown as BattleMapConfig;

const at = (x: number, y: number) => {
    const p = caster();

    p.battleData.position = { x, y };

    return p;
};

describe('dispel range', () => {
    it('reactive range is measured to the spell, not to its caster', () => {
        const dispeller = at(0, 0);

        const far = withWfrpState(at(30, 0), {
            lastCast: { spell: 'Bolt', sl: 1, at: { x: 1, y: 0 } },
        });

        expect(dispelSpotOf(far, 'reactive')).toEqual({ x: 1, y: 0 });
        expect(
            isDispelRange(dispeller, dispelSpotOf(far, 'reactive'), map, rules)
        ).toBe(true);
        expect(
            isDispelRange(
                dispeller,
                dispelSpotOf(far, 'persistent'),
                map,
                rules
            )
        ).toBe(false);
    });

    it('falls back to the caster cell without a stored spot', () => {
        const foe = at(5, 5);

        expect(dispelSpotOf(foe, 'reactive')).toEqual({ x: 5, y: 5 });
    });
});
