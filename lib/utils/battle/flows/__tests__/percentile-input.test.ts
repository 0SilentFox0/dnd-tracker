import { describe, expect, it } from 'vitest';

import { composePercentile, parsePercentileField } from '../percentile-input';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleAttack } from '@/types/battle';

const attack = (type: AttackType): BattleAttack => ({
    id: 'a',
    name: 'A',
    type,
    attackBonus: 0,
    damageDice: '1d6',
    damageType: 'slashing',
});

const archer = () => {
    const p = makeParticipant({ id: 'a', side: ParticipantSide.ALLY });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                base: { ...DEFAULT_CHARACTERISTICS.base, ws: 41, bs: 52 },
            }),
        },
    };
};

describe('composePercentile', () => {
    it.each([
        [0, 0, 100],
        [10, 0, 10],
        [90, 9, 99],
        [0, 1, 1],
    ])('tens %i + units %i = %i', (tens, units, expected) => {
        expect(composePercentile(tens, units)).toBe(expected);
    });

    it('is incomplete without both dice', () => {
        expect(composePercentile(undefined, 3)).toBeUndefined();
        expect(composePercentile(20, undefined)).toBeUndefined();
    });

    it('matches the fallback field for 1..100', () => {
        for (let n = 1; n <= 100; n++) {
            const tens = n === 100 ? 0 : Math.floor(n / 10) * 10;

            expect(composePercentile(tens, n === 100 ? 0 : n % 10)).toBe(
                parsePercentileField(String(n))
            );
        }
    });

    it('parses the field: 100 ok, 0 and 101 ignored', () => {
        expect(parsePercentileField('100')).toBe(100);
        expect(parsePercentileField('0')).toBeNull();
        expect(parsePercentileField('101')).toBe(1);
    });
});

describe('combat.attackTarget', () => {
    it('uses WS for melee and BS for ranged', () => {
        expect(
            ruleSystemOf(WFRP_RULES).combat.attackTarget?.(
                archer(),
                attack(AttackType.MELEE)
            )?.target
        ).toBe(41);
        expect(
            ruleSystemOf(WFRP_RULES).combat.attackTarget?.(
                archer(),
                attack(AttackType.RANGED)
            )?.target
        ).toBe(52);
    });

    it('is null in d20 systems', () => {
        expect(ruleSystemOf(DEFAULT_RULES).combat.attackTarget).toBeUndefined();
    });
});
