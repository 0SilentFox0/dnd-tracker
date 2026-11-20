import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { type Ruleset } from '@/lib/utils/rules/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { mitigateWfrpDamage } from '@/systems/wfrp/rules/combat/mitigate';
import {
    participantStats,
    wfrpAbilitiesOf,
} from '@/systems/wfrp/rules/combat/participant';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import type { QualityRef } from '@/systems/wfrp/rules/equipment/qualities';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const RULES = {
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
} as unknown as Ruleset;

const withAp = (p: BattleParticipant, ap: number): BattleParticipant => ({
    ...p,
    abilities: {
        ...p.abilities,
        ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, {
            ap: { head: ap, arm: ap, body: ap, leg: ap },
        }),
    },
});

const attack = (
    qualities: QualityRef[],
    flaws: QualityRef[] = []
): BattleAttack => ({
    id: 'w',
    name: 'w',
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '',
    damageType: 'physical',
    system: ATTACK_SLOT.write({ qualities, flaws }),
});

const hit = (
    qualities: QualityRef[],
    o: {
        flaws?: QualityRef[];
        ap?: number;
        netSl?: number;
        attackRoll?: number;
        location?: 'head' | 'body';
        crit?: boolean;
    } = {}
) => {
    const target = withAp(
        makeParticipant({ id: 't', hp: 30, maxHp: 30 }),
        o.ap ?? 3
    );

    const result = mitigateWfrpDamage({
        attacker: withAp(makeParticipant({ id: 'a', hp: 10, maxHp: 10 }), 0),
        target,
        weapon: 6,
        amount: 6,
        margin: o.netSl ?? 2,
        attackRoll: o.attackRoll ?? 24,
        location: o.location ?? 'body',
        crit: o.crit ?? false,
        rng: () => 0.5,
        rules: RULES,
        attack: attack(qualities, o.flaws),
    });

    return { target, result };
};

describe('canon weapon qualities', () => {
    bookExample(
        304,
        'p304 Damaging uses the units die when it beats SL',
        () => {
            const plain = hit([]).result.amount;

            expect(hit([{ key: 'damaging' }]).result.amount).toBe(plain + 2);
        }
    );

    bookExample(304, 'p304 Blast deals weapon damage without SL damage', () => {
        const plain = hit([]).result.amount;

        expect(hit([{ key: 'blast', value: 3 }]).result.amount).toBe(plain - 2);
    });

    bookExample(304, 'p304 Penetrating ignores 2 AP', () => {
        expect(hit([{ key: 'penetrating' }]).result.amount).toBe(
            hit([], { ap: 1 }).result.amount
        );
    });

    bookExample(
        305,
        'p305 Undamaging doubles AP and may deal no Wounds',
        () => {
            const r = hit([], {
                flaws: [{ key: 'undamaging' }],
                ap: 6,
                netSl: 0,
            });

            expect(r.result.amount).toBe(0);
        }
    );

    bookExample(304, 'p304 Hack wears the struck armour by 1 AP', () => {
        const { target, result } = hit([{ key: 'hack' }]);

        const after = result.afterHit!(target, 1).participant;

        expect(participantStats(after)?.armourDamage).toEqual({ body: 1 });
    });

    bookExample(
        305,
        'p305 Pummel to the head stuns when Wounds reach TB',
        () => {
            const { target, result } = hit([{ key: 'pummel' }], {
                location: 'head',
                ap: 0,
            });

            const after = result.afterHit!(target, 1).participant;

            expect(conditionLevel(after, 'stunned')).toBe(1);
        }
    );

    bookExample(305, 'p305 Pummel elsewhere does not stun', () => {
        expect(hit([{ key: 'pummel' }]).result.afterHit).toBeUndefined();
    });

    bookExample(304, 'p304 Entangle inflicts Entangled on a hit', () => {
        const { target, result } = hit([{ key: 'entangle', value: 3 }]);

        expect(
            conditionLevel(result.afterHit!(target, 1).participant, 'entangled')
        ).toBe(1);
    });
    bookExample(
        304,
        'Inflict (Condition) applies one level regardless of value',
        () => {
            const { target, result } = hit([
                { key: 'inflict', value: 3, condition: 'bleeding' },
            ]);

            expect(
                conditionLevel(
                    result.afterHit!(target, 1).participant,
                    'bleeding'
                )
            ).toBe(1);
        }
    );

    bookExample(304, 'Inflict without a condition is skipped', () => {
        expect(
            hit([{ key: 'inflict', value: 2 }]).result.afterHit
        ).toBeUndefined();
    });
});
