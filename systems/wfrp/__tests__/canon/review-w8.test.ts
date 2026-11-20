import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import '@/lib/server/systems/registry';
import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import {
    slotOf,
    withStats,
} from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { mitigateWfrpDamage } from '@/systems/wfrp/rules/combat/mitigate';
import { hasMomentum } from '@/systems/wfrp/rules/combat/momentum';
import { participantStats } from '@/systems/wfrp/rules/combat/participant';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import type { QualityRef } from '@/systems/wfrp/rules/equipment/qualities';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const fighter = (
    id: string,
    over: { ws?: number; bs?: number; wp?: number; effects?: unknown[] } = {}
): BattleParticipant => {
    const base = makeParticipant({
        id,
        hp: 20,
        maxHp: 20,
        abilities: over.effects
            ? [trait(over.effects, { key: `t-${id}` })]
            : [],
    });

    return {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                base: {
                    ...DEFAULT_CHARACTERISTICS.base,
                    ws: over.ws ?? 40,
                    bs: over.bs ?? 40,
                    wp: over.wp ?? 20,
                },
            }),
        },
    };
};

const weapon = (type: AttackType, qualities: QualityRef[], group?: string) =>
    ({
        id: 'w',
        name: 'w',
        type,
        system: ATTACK_SLOT.write({
            qualities,
            flaws: [],
            ...(group && { group }),
        }),
    }) as unknown as BattleAttack;

const resolve = (
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack: BattleAttack,
    manualRoll: number,
    rngValue = 0.5
) =>
    resolveWfrpAttack({
        attacker,
        target,
        attack,
        participants: [attacker, target],
        rules: canon,
        rng: () => rngValue,
        manualRoll,
    });

describe('W8 review: Blackpowder psychology on a miss', () => {
    const gun = weapon(AttackType.RANGED, [{ key: 'blackpowder' }]);

    bookExample(304, 'a miss still shocks a target that fails Cool', () => {
        const target = fighter('t', { wp: 5 });

        const r = resolve(fighter('a'), target, gun, 99, 0.99);

        expect(r.isHit).toBe(false);

        expect(
            conditionLevel(r.targetUpdate?.(target) ?? target, 'broken')
        ).toBe(1);
    });

    bookExample(304, 'a psychology-immune target is not shocked', () => {
        const target = fighter('t', {
            wp: 5,
            effects: [
                { kind: 'flag', flag: 'conditionImmunity', conditions: 'all' },
            ],
        });

        const r = resolve(fighter('a'), target, gun, 99, 0.99);

        expect(
            conditionLevel(r.targetUpdate?.(target) ?? target, 'broken')
        ).toBe(0);
    });
});

describe('W8 review: unopposed Parry strike', () => {
    bookExample(
        300,
        'a missed unopposed Parry strike gives the defender no Momentum',
        () => {
            const attacker = withWfrpState(fighter('a'), {
                momentumAttack: true,
                meleeHit: true,
            });

            const target = fighter('t');

            const r = resolve(
                attacker,
                target,
                weapon(AttackType.MELEE, [{ key: 'parry' }]),
                99
            );

            expect(r.isHit).toBe(false);
            expect(hasMomentum(r.targetUpdate?.(target) ?? target)).toBe(false);
        }
    );
});

describe('W8 review: Impale needs a passed test', () => {
    const impale = weapon(AttackType.MELEE, [{ key: 'impale' }]);

    bookExample(304, 'a failed test that still hits is not a critical', () => {
        const r = resolve(
            fighter('a', { ws: 30 }),
            fighter('t', { ws: 1 }),
            impale,
            40,
            0.99
        );

        expect(r.isHit).toBe(true);
        expect(r.attackRoll.isCritical).toBe(false);
    });

    bookExample(
        304,
        'a passed test on a roll divisible by 10 is a critical',
        () => {
            const r = resolve(
                fighter('a', { ws: 60 }),
                fighter('t', { ws: 1 }),
                impale,
                40,
                0.99
            );

            expect(r.attackRoll.isCritical).toBe(true);
        }
    );
});

describe('W8 review: Hack with Penetrating and worn armour', () => {
    bookExample(304, 'worn AP is reduced before Penetrating applies', () => {
        const armoured = (ap: number, worn: number) =>
            withStats(makeParticipant({ id: 't', hp: 30, maxHp: 30 }), {
                ap: { head: ap, arm: ap, body: ap, leg: ap },
                ...(worn && { armourDamage: { body: worn } }),
            });

        const strike = (target: BattleParticipant, q: QualityRef[]) =>
            mitigateWfrpDamage({
                attacker: makeParticipant({ id: 'a', hp: 10, maxHp: 10 }),
                target,
                weapon: 6,
                amount: 6,
                margin: 2,
                attackRoll: 24,
                location: 'body',
                crit: false,
                rng: () => 0.5,
                rules: canon,
                attack: weapon(AttackType.MELEE, q),
            });

        const worn = armoured(4, 2);

        const r = strike(worn, [{ key: 'hack' }, { key: 'penetrating' }]);

        expect(r.amount).toBe(strike(armoured(0, 0), []).amount);

        const after = r.afterHit!(worn, 1).participant;

        expect(participantStats(after)?.armourDamage).toEqual({ body: 3 });
    });
});
