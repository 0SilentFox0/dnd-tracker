import { describe, expect, it } from 'vitest';

import { bookExample, CANON } from './book-example';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { applyWfrpCrit } from '@/systems/wfrp/rules/combat/crit-effect';
import { rollCrit } from '@/systems/wfrp/rules/combat/crit-table';
import { wfrpAttackBlocked } from '@/systems/wfrp/rules/combat/disarm';
import {
    asLocation,
    hitLocation,
    LOCATION_WEIGHTS,
    sideOf,
} from '@/systems/wfrp/rules/combat/location';
import {
    hasMomentum,
    secondAttackBlocker,
    withMomentum,
} from '@/systems/wfrp/rules/combat/momentum';
import { reverseRoll } from '@/systems/wfrp/rules/percentile';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleAttack } from '@/types/battle';

const CANON_RULES = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const LEGACY_RULES = RulesetSchema.parse(WFRP_RULES);

const attack = (offHand: boolean, hand = true): BattleAttack =>
    ({
        id: 'a',
        type: 'melee',
        system: ATTACK_SLOT.write({
            qualities: [],
            flaws: [],
            ...(hand && {
                hand: offHand ? ('off' as const) : ('main' as const),
            }),
        }),
    }) as BattleAttack;

const disarmedBy = (side: 'left' | 'right' | undefined) => {
    const crit = {
        ...rollCrit('arm', WFRP_RULES, () => 0, 1, 0, side),
        markers: ['disarmed'],
    };

    return applyWfrpCrit(makeParticipant({ id: 't' }), crit, 1, CANON)
        .participant;
};

describe('canon: left and right hit locations (p164)', () => {
    bookExample(
        164,
        'reversed roll picks head, arms, body and legs by side',
        () => {
            const spot = (reversed: number) =>
                hitLocation(reverseRoll(reversed), true);

            expect(spot(5)).toBe('head');
            expect(spot(9)).toBe('head');
            expect(spot(10)).toBe('leftArm');
            expect(spot(24)).toBe('leftArm');
            expect(spot(25)).toBe('rightArm');
            expect(spot(44)).toBe('rightArm');
            expect(spot(45)).toBe('body');
            expect(spot(79)).toBe('body');
            expect(spot(80)).toBe('leftLeg');
            expect(spot(89)).toBe('leftLeg');
            expect(spot(90)).toBe('rightLeg');
            expect(spot(100)).toBe('rightLeg');
        }
    );

    it('legacy keeps the four zones', () => {
        expect(hitLocation(41)).toBe('arm');
        expect(hitLocation(98)).toBe('leg');
    });

    it('a split spot resolves to its zone and side', () => {
        expect(asLocation('leftLeg')).toBe('leg');
        expect(sideOf('leftLeg')).toBe('left');
        expect(sideOf('arm')).toBeUndefined();
    });

    it('zone weights keep arm 35% and leg 21%', () => {
        expect(LOCATION_WEIGHTS.arm).toBeCloseTo(0.35);
        expect(LOCATION_WEIGHTS.leg).toBeCloseTo(0.21);
    });

    it('the crit result remembers the side of an arm or leg only', () => {
        expect(rollCrit('arm', WFRP_RULES, () => 0, 1, 0, 'left').side).toBe(
            'left'
        );
        expect(
            rollCrit('body', WFRP_RULES, () => 0, 1, 0, 'left').side
        ).toBeUndefined();
    });

    bookExample(
        164,
        'a disarmed right arm blocks main-hand attacks only',
        () => {
            const p = disarmedBy('right');

            expect(wfrpAttackBlocked(p, attack(false), CANON_RULES)).toBe(true);
            expect(wfrpAttackBlocked(p, attack(true), CANON_RULES)).toBe(false);
        }
    );

    bookExample(164, 'a disarmed left arm blocks off-hand attacks only', () => {
        const p = disarmedBy('left');

        expect(wfrpAttackBlocked(p, attack(true), CANON_RULES)).toBe(true);
        expect(wfrpAttackBlocked(p, attack(false), CANON_RULES)).toBe(false);
    });

    it('a bare disarmed marker counts as the primary arm', () => {
        expect(
            wfrpAttackBlocked(disarmedBy(undefined), attack(false), CANON_RULES)
        ).toBe(true);
    });

    it('a handless attack (trait, unarmed, spell) is never blocked', () => {
        expect(
            wfrpAttackBlocked(
                disarmedBy('right'),
                attack(false, false),
                CANON_RULES
            )
        ).toBe(false);
    });

    it('legacy never blocks an attack', () => {
        expect(
            wfrpAttackBlocked(disarmedBy('right'), attack(false), LEGACY_RULES)
        ).toBe(false);
    });

    it('Momentum is not spendable on a second attack when the off hand is disarmed', () => {
        const p = withWfrpState(withMomentum(disarmedBy('left'), true), {
            lastHand: 'main',
        });

        const armed = {
            ...p,
            actionFlags: { ...p.actionFlags, hasUsedAction: true },
            battleData: {
                ...p.battleData,
                attacks: [attack(false), { ...attack(true), id: 'b' }],
            },
        };

        expect(hasMomentum(armed)).toBe(true);
        expect(secondAttackBlocker(armed, CANON_RULES)).toBe('weapons');
        expect(secondAttackBlocker(armed, LEGACY_RULES)).toBeNull();
    });
});
