import { describe, expect, it } from 'vitest';

import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { resetTurnState } from '@/lib/utils/battle/turn/turn-state';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { d20State, withD20State } from '@/systems/d20/rules/state';
import { OFF_HAND_RULES } from '@/systems/offhand/rules/off-hand';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const light: BattleAttack = {
    id: 'dg',
    name: 'Кинджал',
    type: AttackType.MELEE,
    attackBonus: 3,
    damageDice: '1d4',
    damageType: 'piercing',
    traits: ['light'],
};

const off: BattleAttack = { ...light, id: 'dg:off', hand: 'off' };

const five = (
    over: Partial<BattleParticipant['battleData']> = {}
): BattleParticipant => {
    const p = makeParticipant({ id: 'h' });

    return {
        ...p,
        abilities: { ...p.abilities, damageModel: '5e' },
        battleData: { ...p.battleData, attacks: [light, off], ...over },
    };
};

describe('d20 off-hand', () => {
    it('is ready after a light main-hand attack, in the slot form', () => {
        const armed = OFF_HAND_RULES.arm(five(), light);

        expect(d20State(armed).attackedWithLight).toBe(true);
        expect(OFF_HAND_RULES.ready(armed)).toBe(true);
    });

    it('is not ready without the light attack, without an off-hand weapon, or with the bonus action spent', () => {
        expect(OFF_HAND_RULES.ready(five())).toBe(false);

        const armed = withD20State(five(), { attackedWithLight: true });

        expect(
            OFF_HAND_RULES.ready({
                ...armed,
                battleData: {
                    ...armed.battleData,
                    attacks: [light],
                },
            })
        ).toBe(false);
        expect(
            OFF_HAND_RULES.ready({
                ...armed,
                actionFlags: { ...armed.actionFlags, hasUsedBonusAction: true },
            })
        ).toBe(false);
    });

    it('is not ready for a non-5e participant', () => {
        const p = five();

        const armed = withD20State(
            { ...p, abilities: { ...p.abilities, damageModel: undefined } },
            { attackedWithLight: true }
        );

        expect(OFF_HAND_RULES.ready(armed)).toBe(false);
        expect(OFF_HAND_RULES.allowed(armed)).toBe(false);
    });

    it('arms only for a main-hand melee light attack', () => {
        expect(
            OFF_HAND_RULES.arm(five(), off).battleData.system
        ).toBeUndefined();
        expect(
            OFF_HAND_RULES.arm(five(), { ...light, type: AttackType.RANGED })
                .battleData.system
        ).toBeUndefined();
        expect(
            OFF_HAND_RULES.arm(five(), { ...light, traits: [] }).battleData
                .system
        ).toBeUndefined();
    });

    it('a new turn clears the readiness', () => {
        const slot = resetTurnState(
            withD20State(five(), { attackedWithLight: true }),
            { rules: DEFAULT_RULES }
        );

        expect(
            d20State({ ...five(), battleData: slot }).attackedWithLight
        ).toBe(undefined);
    });
});
