import { describe, expect, it } from 'vitest';

import { noActions, noReactions } from '@/lib/utils/battle/actions/none';
import { noProficiency, noSaves } from '@/lib/utils/battle/saves/none';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { D20_ACTIONS } from '@/systems/d20/rules/actions';
import { D20_REACTIONS } from '@/systems/d20/rules/reactions';
import { D20_PROFICIENCY, D20_SAVES } from '@/systems/d20/rules/saves';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

describe('combat slots through the registry', () => {
    it('wfrp answers with the null objects', () => {
        const { combat } = ruleSystemOf(WFRP_RULES);

        expect(combat.actions).toBe(noActions);
        expect(combat.reactions).toBe(noReactions);
        expect(combat.saves).toBe(noSaves);
        expect(combat.proficiency).toBe(noProficiency);
    });

    it('d20 answers with its own actions, reactions, saves and proficiency', () => {
        const { combat } = ruleSystemOf(DEFAULT_RULES);

        expect(combat.actions).toBe(D20_ACTIONS);
        expect(combat.reactions).toBe(D20_REACTIONS);
        expect(combat.saves).toBe(D20_SAVES);
        expect(combat.proficiency).toBe(D20_PROFICIENCY);
    });
});
