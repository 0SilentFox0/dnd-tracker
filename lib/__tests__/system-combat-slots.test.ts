import { describe, expect, it } from 'vitest';

import { noActions, noReactions } from '@/lib/utils/battle/actions/none';
import { proficiencyOf, savesOf } from '@/lib/utils/battle/saves/access';
import { noProficiency, noSaves } from '@/lib/utils/battle/saves/none';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { D20_ACTIONS } from '@/systems/d20/rules/actions';
import { D20_REACTIONS } from '@/systems/d20/rules/reactions';
import { D20_PROFICIENCY, D20_SAVES } from '@/systems/d20/rules/saves';
import { opportunityOnMove } from '@/systems/opportunity/rules/on-move';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

describe('combat slots through the registry', () => {
    it('wfrp answers with the null objects', () => {
        const { combat } = ruleSystemOf(WFRP_RULES);

        expect(combat.actions).toBe(noActions);
        expect(combat.reactions).toBe(noReactions);
        expect(savesOf(WFRP_RULES)).toBe(noSaves);
        expect(proficiencyOf(WFRP_RULES)).toBe(noProficiency);
    });

    it('d20 answers with its own actions, reactions, saves and proficiency', () => {
        const { combat } = ruleSystemOf(DEFAULT_RULES);

        expect(combat.actions.move).toBe(D20_ACTIONS.move);
        expect(combat.actions.run).toBe(D20_ACTIONS.run);
        expect(combat.actions.catalog).toBe(D20_ACTIONS.catalog);
        expect(combat.actions.onMove).toEqual([opportunityOnMove]);
        expect(combat.reactions).toBe(D20_REACTIONS);
        expect(combat.saves).toBe(D20_SAVES);
        expect(combat.proficiency).toBe(D20_PROFICIENCY);
    });

    it('bare d20 has no move hooks', () => {
        const { combat } = ruleSystemOf({
            ...DEFAULT_RULES,
            system: { key: 'd20' },
        });

        expect(combat.actions.move).toBe(D20_ACTIONS.move);
        expect(combat.actions.onMove).toBeUndefined();
    });
});
