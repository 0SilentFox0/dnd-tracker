import { describe, expect, it } from 'vitest';

import {
    actionEconomyOf,
    actionsOf,
    NO_ACTION_ECONOMY,
    reactionsOf,
} from '@/lib/utils/battle/actions/access';
import { noActions, noReactions } from '@/lib/utils/battle/actions/none';
import { hitModelOf, noHitModel } from '@/lib/utils/battle/balance/hit-model';
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

        expect(combat.actions).toBeUndefined();
        expect(combat.reactions).toBeUndefined();
        expect(combat.actionEconomy).toBeUndefined();
        expect(actionsOf(WFRP_RULES)).toBe(noActions);
        expect(reactionsOf(WFRP_RULES)).toBe(noReactions);
        expect(actionEconomyOf(WFRP_RULES)).toBe(NO_ACTION_ECONOMY);
        expect(savesOf(WFRP_RULES)).toBe(noSaves);
        expect(proficiencyOf(WFRP_RULES)).toBe(noProficiency);
    });

    it('d20 answers with its own actions, reactions, saves and proficiency', () => {
        const { combat } = ruleSystemOf(DEFAULT_RULES);

        expect(actionsOf(DEFAULT_RULES).move).toBe(D20_ACTIONS.move);
        expect(actionsOf(DEFAULT_RULES).run).toBe(D20_ACTIONS.run);
        expect(actionsOf(DEFAULT_RULES).catalog).toBe(D20_ACTIONS.catalog);
        expect(actionsOf(DEFAULT_RULES).onMove).toEqual([opportunityOnMove]);
        expect(combat.reactions).toBe(D20_REACTIONS);
        expect(combat.saves).toBe(D20_SAVES);
        expect(combat.proficiency).toBe(D20_PROFICIENCY);
    });

    it('bare d20 has no move hooks', () => {
        const rules = { ...DEFAULT_RULES, system: { key: 'd20' } };

        expect(actionsOf(rules).move).toBe(D20_ACTIONS.move);
        expect(actionsOf(rules).onMove).toBeUndefined();
    });

    it('noHitModel is an even matchup with one damage per hit', () => {
        expect(noHitModel.winChance(0, 0)).toBe(noHitModel.refHit);
        expect(noHitModel.damage({} as never)).toBe(1);
        expect(hitModelOf(DEFAULT_RULES)).toBe(
            ruleSystemOf(DEFAULT_RULES).combat.hitModel
        );
    });
});
