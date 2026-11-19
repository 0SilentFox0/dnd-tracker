import { describe, expect, it } from 'vitest';

import {
    bareD20Rules,
    dnd5eRules,
} from '@/lib/__tests__/helpers/dnd5e-modules';
import { AttackType } from '@/lib/constants/battle';
import { makeParticipant, resolved } from '@/lib/utils/abilities/__tests__/fixtures';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { resetSystemState } from '@/lib/utils/battle/turn/turn-state';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { d20State, withD20State } from '@/systems/d20/rules/state';

describe('offhand module composition', () => {
    it('the module adds the off-hand hook and the turn reset', () => {
        const { combat } = ruleSystemOf(dnd5eRules());

        expect(combat.secondaryAttack).toBeDefined();
        expect(combat.turn?.resetState).toHaveLength(1);
    });

    it('bare d20 has neither', () => {
        const { combat } = ruleSystemOf(bareD20Rules());

        expect(combat.secondaryAttack).toBeUndefined();
        expect(combat.turn?.resetState ?? []).toHaveLength(0);
    });

    it('attackedWithLight resets at turn end only with the module', () => {
        const armed = withD20State(createMockParticipant(), {
            attackedWithLight: true,
        });

        expect(
            d20State(resetSystemState(armed, 'turn', dnd5eRules()))
                .attackedWithLight
        ).toBeUndefined();
        expect(
            d20State(resetSystemState(armed, 'turn', bareD20Rules()))
                .attackedWithLight
        ).toBe(true);
    });
});

describe('Nick mastery frees the off-hand attack', () => {
    const dagger = {
        id: 'd',
        name: 'Dagger',
        type: AttackType.MELEE,
        attackBonus: 0,
        damageDice: '1d4',
        damageType: 'piercing',
        properties: 'Mastery: Nick',
        traits: ['light' as const],
        hand: 'off' as const,
    };

    const nicker = () => {
        const p = makeParticipant({
            id: 'n',
            abilities: [
                resolved({
                    trigger: { event: 'passive' },
                    params: { weaponMastery: ['dagger'] },
                    effects: [{ kind: 'note', text: 'Mastery' }],
                }),
            ],
        });

        return withD20State(
            {
                ...p,
                abilities: { ...p.abilities, damageModel: '5e' },
                actionFlags: { ...p.actionFlags, hasUsedBonusAction: true },
                battleData: { ...p.battleData, attacks: [dagger] },
            },
            { attackedWithLight: true }
        );
    };

    it('the off-hand stays ready after the bonus action was spent', () => {
        const { secondaryAttack } = ruleSystemOf(dnd5eRules()).combat;

        expect(secondaryAttack?.ready(nicker())).toBe(true);
    });

    it('free() spends the once-per-turn use', () => {
        const { secondaryAttack } = ruleSystemOf(dnd5eRules()).combat;

        const spent = secondaryAttack?.free?.(nicker(), dagger, 1);

        expect(spent).toBeTruthy();
        expect(secondaryAttack?.free?.(spent!, dagger, 1)).toBeNull();
        expect(secondaryAttack?.ready(spent!)).toBe(false);
    });
});
