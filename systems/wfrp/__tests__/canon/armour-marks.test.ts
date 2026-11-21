import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { mitigateWfrpDamage } from '@/systems/wfrp/rules/combat/mitigate';
import { armourAp } from '@/systems/wfrp/rules/equipment/armour';
import type { QualityKey } from '@/systems/wfrp/rules/equipment/qualities';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const attack = (impale: boolean): BattleAttack =>
    ({
        id: 'a',
        name: 'a',
        type: AttackType.MELEE,
        attackBonus: 0,
        damageDice: '',
        damageBonus: 6,
        damageType: 'physical',
        system: ATTACK_SLOT.write({
            qualities: impale ? [{ key: 'impale' }] : [],
            flaws: [],
        }),
    }) as unknown as BattleAttack;

const marked = (mark: 'impenetrable' | 'weakpoints' | 'partial') =>
    withStats(makeParticipant({ id: 'v' }), {
        tb: 0,
        ap: { head: 3, arm: 3, body: 3, leg: 3 },
        marks: { [mark]: { head: 2, arm: 2, body: 2, leg: 2 } },
    });

const hit = (
    target: BattleParticipant,
    over: { crit: boolean; roll: number; impale?: boolean }
) =>
    mitigateWfrpDamage({
        attacker: withStats(
            makeParticipant({ id: 'a', side: ParticipantSide.ENEMY }),
            { sb: 0 }
        ),
        target,
        weapon: 6,
        amount: 6,
        margin: 0,
        location: 'body',
        crit: over.crit,
        attackRoll: over.roll,
        rng: () => 0.5,
        rules: canon,
        attack: attack(over.impale ?? false),
    });

const piece = (...qualities: QualityKey[]) => ({
    slot: 'armor',
    systemStats: {
        type: 'armour',
        locations: { head: 0, arm: 0, body: 2, leg: 0 },
        kind: 'plate',
        qualities: qualities.map((key) => ({ key })),
        weight: 1,
        price: 1,
    },
});

describe('canon: armour marks (p306)', () => {
    bookExample(
        306,
        'Impenetrable ignores a Critical Hit on an odd double',
        () => {
            const target = marked('impenetrable');

            expect(
                hit(target, { crit: true, roll: 33 }).afterHit
            ).toBeUndefined();
            expect(
                hit(target, { crit: true, roll: 44 }).afterHit
            ).toBeDefined();
            expect(
                hit(target, { crit: true, roll: 99 }).afterHit
            ).toBeUndefined();
            expect(
                hit(target, { crit: true, roll: 12 }).afterHit
            ).toBeDefined();
        }
    );

    bookExample(
        306,
        'Weakpoints: an Impale critical ignores that armour AP',
        () => {
            const target = marked('weakpoints');

            expect(
                hit(target, { crit: true, roll: 22, impale: true }).amount
            ).toBeGreaterThanOrEqual(6 - 1);
            expect(
                hit(target, { crit: false, roll: 22, impale: true }).amount
            ).toBe(3);
            expect(hit(target, { crit: true, roll: 22 }).amount).toBeLessThan(
                6
            );
        }
    );

    bookExample(
        306,
        'Partial: an even Hit Location number ignores the piece AP',
        () => {
            const target = marked('partial');

            expect(hit(target, { crit: false, roll: 12 }).amount).toBe(3);
            expect(hit(target, { crit: false, roll: 21 }).amount).toBe(5);
            expect(hit(target, { crit: false, roll: 13 }).amount).toBe(3);
        }
    );

    bookExample(
        306,
        'armourAp reports the AP of marked pieces per location',
        () => {
            const gear = armourAp([
                piece('impenetrable', 'weakpoints'),
                piece('partial'),
            ] as never);

            expect(gear.marks?.impenetrable?.body).toBe(2);
            expect(gear.marks?.partial?.body).toBe(2);
            expect(gear.marks?.weakpoints?.head).toBe(0);
        }
    );
});
