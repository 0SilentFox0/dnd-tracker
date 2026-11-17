import { describe, expect, it } from 'vitest';

import {
    bareD20Rules,
    dnd5eRules,
} from '@/lib/__tests__/helpers/dnd5e-modules';
import { AttackType } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { moveWithReactions } from '@/lib/utils/battle/actions/dispatch';
import { pathTo } from '@/lib/utils/battle/grid/path';
import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const map: BattleMapConfig = {
    cols: 10,
    rows: 5,
    background: null,
    opacity: 0.3,
};

const mk = (
    id: string,
    side: 'ally' | 'enemy',
    x: number,
    y: number,
    attacks: BattleParticipant['battleData']['attacks'] = []
): BattleParticipant => {
    const base = createMockParticipant();

    return {
        ...base,
        basicInfo: {
            ...base.basicInfo,
            id,
            name: id,
            side: side as never,
            controlledBy: side === 'ally' ? 'user-1' : 'dm',
        },
        combatStats: {
            ...base.combatStats,
            speed: 30,
            currentHp: 50,
            maxHp: 50,
        },
        battleData: { ...base.battleData, position: { x, y }, attacks },
    };
};

const sword = {
    id: 'sw',
    name: 'Sword',
    type: AttackType.MELEE,
    attackBonus: 5,
    damageDice: '1d6',
    damageType: 'slashing',
};

const walkAway = (rules: Ruleset) => {
    const mover = mk('m', 'ally', 1, 0);

    const ps = [mover, mk('e', 'enemy', 0, 1, [sword])];

    const to = { x: 3, y: 0 };

    return moveWithReactions({
        map,
        participants: ps,
        mover,
        to,
        path: pathTo(map, ps, mover, to, 10),
        budget: 10,
        cost: 2,
        round: 1,
        battleId: 'b1',
        rules,
        rng: () => 0.99,
    });
};

describe('opportunity module composition', () => {
    it('the module adds the move and after-attack hooks', () => {
        const { combat } = ruleSystemOf(dnd5eRules());

        expect(combat.actions.onMove).toHaveLength(1);
        expect(combat.afterAttack).toHaveLength(1);
    });

    it('bare d20 has neither', () => {
        const { combat } = ruleSystemOf(bareD20Rules());

        expect(combat.actions.onMove ?? []).toHaveLength(0);
        expect(combat.afterAttack ?? []).toHaveLength(0);
    });

    it('walking out of reach provokes a strike only with the module', () => {
        const withModule = walkAway(dnd5eRules());

        expect(withModule.events).toHaveLength(1);
        expect(withModule.messages.length).toBeGreaterThan(0);

        const bare = walkAway(bareD20Rules());

        expect(bare.events).toHaveLength(0);
        expect(bare.messages).toEqual([]);
        expect(bare.destination).toEqual({ x: 3, y: 0 });
    });

    it('the module respects actions.opportunityAttacks = false', () => {
        const rules = dnd5eRules();

        const off = walkAway({
            ...rules,
            actions: { ...rules.actions, opportunityAttacks: false },
        });

        expect(off.events).toHaveLength(0);
    });
});
