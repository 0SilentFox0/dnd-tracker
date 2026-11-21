import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { mitigateWfrpDamage } from '@/systems/wfrp/rules/combat/mitigate';
import { participantStats } from '@/systems/wfrp/rules/combat/participant';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ACTION_SLOT, ATTACK_SLOT, PARTICIPANT_SLOT } from '@/systems/wfrp/rules/slots';
import { wfrpState } from '@/systems/wfrp/rules/state';
import type { BreathKind } from '@/systems/wfrp/rules/trait-kinds';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import { wfrpUnitBuild } from '@/systems/wfrp/rules/traits/unit-build';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const legacy = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'legacy' },
});

const breathAttack = (breath: BreathKind): BattleAttack =>
    ({
        id: 'breath',
        name: 'Breath',
        type: AttackType.RANGED,
        range: '72 ft',
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
        system: ATTACK_SLOT.write({
            qualities: [],
            flaws: [],
            noSb: true,
            breath,
        }),
    }) as unknown as BattleAttack;

const breather = (sb: number, tb: number): BattleParticipant =>
    withStats(makeParticipant({ id: 'dragon', side: ParticipantSide.ENEMY }), {
        sb,
        tb,
    });

const victim = (tb: number, ap: number, metal = 0): BattleParticipant =>
    withStats(makeParticipant({ id: 'v' }), {
        tb,
        ap: { head: ap, arm: ap, body: ap, leg: ap },
        ...(metal && {
            metalAp: { head: metal, arm: metal, body: metal, leg: metal },
        }),
    });

const breathe = (
    kind: BreathKind,
    attacker: BattleParticipant,
    target: BattleParticipant
) =>
    mitigateWfrpDamage({
        attacker,
        target,
        weapon: 0,
        amount: 5,
        margin: 0,
        location: 'body',
        crit: false,
        rng: () => 0.5,
        rules: canon,
        attack: breathAttack(kind),
    });

const after = (r: ReturnType<typeof breathe>, p: BattleParticipant) =>
    r.afterHit!(p, 1).participant;

describe('canon: Breath types (p358)', () => {
    bookExample(358, 'Fire: SB+3 less TB and AP, and the target is Ablaze', () => {
        const target = victim(3, 1);

        const r = breathe('fire', breather(5, 4), target);

        expect(r.amount).toBe(8 - 3 - 1);
        expect(conditionLevel(after(r, target), 'ablaze')).toBeGreaterThan(0);
        expect(wfrpState(after(r, target)).fireWounds).toBe(4);
    });

    bookExample(358, 'Cold: SB+2 and Fatigued', () => {
        const target = victim(3, 0);

        const r = breathe('cold', breather(5, 4), target);

        expect(r.amount).toBe(7 - 3);
        expect(conditionLevel(after(r, target), 'fatigued')).toBeGreaterThan(0);
    });

    bookExample(358, 'Electricity ignores metal armour and Stuns', () => {
        const mail = victim(3, 2, 2);

        const r = breathe('electricity', breather(5, 4), mail);

        expect(r.amount).toBe(7 - 3);
        expect(conditionLevel(after(r, mail), 'stunned')).toBeGreaterThan(0);

        expect(breathe('cold', breather(5, 4), mail).amount).toBe(7 - 3 - 2);
    });

    bookExample(358, 'Poison: TB+2 (the breather) and Poisoned', () => {
        const target = victim(3, 0);

        const r = breathe('poison', breather(5, 4), target);

        expect(r.amount).toBe(6 - 3);
        expect(conditionLevel(after(r, target), 'poisoned')).toBeGreaterThan(0);
    });

    bookExample(358, 'Acid: TB+4 and one point of armour wear', () => {
        const target = victim(3, 2);

        const r = breathe('acid', breather(5, 4), target);

        expect(r.amount).toBe(8 - 3 - 2);
        expect(
            participantStats(after(r, target))?.armourDamage?.body
        ).toBe(1);
    });

    bookExample(358, 'Smoke does no damage', () => {
        expect(breathe('smoke', breather(5, 4), victim(3, 0)).amount).toBe(0);
    });
});

describe('canon: Breath range and area (p358)', () => {
    const row = {
        id: 'u',
        characteristics: {
            ...DEFAULT_CHARACTERISTICS,
            base: { ...DEFAULT_CHARACTERISTICS.base, s: 50, t: 40 },
        },
    };

    const abilities = [
        trait([
            {
                kind: 'wfrpAttack',
                attack: 'breath',
                damage: 5,
                rangeFt: 36,
                breath: 'fire',
            },
        ]),
    ];

    bookExample(358, 'Range is 20 + TB yards, the blast SB yards around the target', () => {
        const { attacks } = wfrpUnitBuild(row, abilities, canon);

        expect(attacks[0].range).toBe('72 ft');
        expect(attacks[0].blastRadius).toBe(2);
        expect(ATTACK_SLOT.read(attacks[0].system)?.breath).toBe('fire');
    });

    bookExample(358, 'legacy keeps the plain breath', () => {
        const { attacks } = wfrpUnitBuild(row, abilities, legacy);

        expect(attacks[0].range).toBe('36 ft');
        expect(ATTACK_SLOT.read(attacks[0].system)?.breath).toBeUndefined();
    });
});

describe('canon: one attacker roll for every Breath target (p358)', () => {
    const roll = (r: ReturnType<typeof resolveWfrpAttack>) =>
        ACTION_SLOT.read(r.attackRoll.system)?.attack;

    const strike = (
        attacker: BattleParticipant,
        id: string,
        rng: () => number
    ) => {
        const target = victim(3, 0);

        return resolveWfrpAttack({
            attacker,
            target: { ...target, basicInfo: { ...target.basicInfo, id } },
            attack: breathAttack('fire'),
            participants: [],
            rules: canon,
            rng,
        });
    };

    bookExample(358, 'the second target reuses the roll, a new volley rolls anew', () => {
        const a = breather(5, 4);

        const first = strike(a, 'x', () => 0.3);

        const next = first.attackerUpdate!(a);

        const second = strike(next, 'y', () => 0.9);

        expect(roll(second)?.roll).toBe(roll(first)?.roll);

        const again = strike(second.attackerUpdate!(next), 'x', () => 0.9);

        expect(roll(again)?.roll).not.toBe(roll(first)?.roll);
    });

    bookExample(358, 'without Ballistic Skill the roll is against 30', () => {
        const a = breather(5, 4);

        const slot = PARTICIPANT_SLOT.read(a.abilities.system)!;

        const noBs = {
            ...a,
            abilities: {
                ...a.abilities,
                system: PARTICIPANT_SLOT.write({
                    ...slot,
                    characteristics: {
                        ...DEFAULT_CHARACTERISTICS,
                        base: { ...DEFAULT_CHARACTERISTICS.base, bs: 0 },
                    },
                }),
            },
        };

        expect(roll(strike(noBs, 'x', () => 0.3))?.target).toBe(30);
    });
});
