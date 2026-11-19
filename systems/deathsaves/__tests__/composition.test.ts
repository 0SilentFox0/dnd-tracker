import { describe, expect, it } from 'vitest';

import {
    bareD20Rules,
    dnd5eRules,
} from '@/lib/__tests__/helpers/dnd5e-modules';
import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { checkVictoryConditions } from '@/lib/utils/battle/turn/victory';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { startDying } from '@/systems/deathsaves/rules/start';

const rulesOn = (rules: ReturnType<typeof dnd5eRules>) => ({
    ...rules,
    deathSaves: { ...rules.deathSaves, enabled: true },
});

const dyingHero = () => {
    const base = createMockParticipant();

    return startDying(
        {
            ...base,
            combatStats: { ...base.combatStats, currentHp: 0 },
        },
        rulesOn(dnd5eRules())
    );
};

const enemy = () => {
    const base = createMockParticipant();

    return createMockParticipant({
        basicInfo: {
            ...base.basicInfo,
            id: 'e1',
            side: ParticipantSide.ENEMY,
        },
        combatStats: {
            ...base.combatStats,
            currentHp: 9,
            status: CombatStatus.ACTIVE,
        },
    });
};

describe('deathsaves module composition', () => {
    it('the module adds holdsOn, onRevived and the skipped-turn hook to d20', () => {
        const { combat } = ruleSystemOf(dnd5eRules());

        expect(combat.holdsOn).toBeDefined();
        expect(combat.onRevived).toBeDefined();

        const bare = ruleSystemOf(bareD20Rules()).combat.turn?.onSkippedTurn;

        expect(combat.turn?.onSkippedTurn).toHaveLength(
            (bare?.length ?? 0) + 1
        );
    });

    it('bare d20 has none of them', () => {
        const { combat } = ruleSystemOf(bareD20Rules());

        expect(combat.holdsOn).toBeUndefined();
        expect(combat.onRevived).toBeUndefined();
        expect(
            (combat.turn?.onSkippedTurn ?? []).map((hook) => hook.name)
        ).toEqual(['d20RegenWake']);
    });

    it('victory waits for a dying hero with the module and not without it', () => {
        const order = [dyingHero(), enemy()];

        expect(
            checkVictoryConditions(order, [], rulesOn(dnd5eRules())).isDefeat
        ).toBe(false);

        expect(
            checkVictoryConditions(order, [], rulesOn(bareD20Rules())).isDefeat
        ).toBe(true);
    });
});
