import { describe, expect, it } from 'vitest';

import { makeEffect } from '@/lib/utils/abilities/__tests__/fixtures';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import {
    canReact,
    pickMeleeAttack,
    reactionBlocker,
} from '@/systems/d20/rules/reactions/reaction';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const atk = (name: string, over: Partial<BattleAttack> = {}): BattleAttack => ({
    name,
    type: 'melee',
    attackBonus: 3,
    damageDice: '1d6',
    damageType: 'slashing',
    ...over,
});

const withAttacks = (...attacks: BattleAttack[]): BattleParticipant => {
    const p = createMockParticipant();

    return { ...p, battleData: { ...p.battleData, attacks } };
};

describe('reactionBlocker / canReact', () => {
    it('a fresh active participant can react', () => {
        const p = createMockParticipant();

        expect(reactionBlocker(p)).toBeNull();
        expect(canReact(p)).toBe(true);
    });

    it('a spent reaction blocks with the reactionUsed reason', () => {
        const p = createMockParticipant();

        p.actionFlags.hasUsedReaction = true;

        expect(reactionBlocker(p)).toMatchObject({
            message: 'battleActions.reject.reactionUsed',
        });
        expect(canReact(p)).toBe(false);
    });

    it('a non-active participant cannot react', () => {
        const p = createMockParticipant();

        p.combatStats.status = 'dead';

        expect(reactionBlocker(p)).toMatchObject({
            message: 'battleActions.reject.cannotReact',
        });
    });

    it.each([['incapacitated'], ['no_reaction']])('%s blocks', (marker) => {
        const p = createMockParticipant();

        p.battleData.activeEffects = [
            makeEffect('e', { effects: [{ type: marker, value: 1 }] }),
        ];

        expect(canReact(p)).toBe(false);
    });
});

describe('pickMeleeAttack', () => {
    it('picks the first main-hand melee attack of equal reach, skipping ranged and off-hand', () => {
        const p = withAttacks(
            atk('bow', { type: 'ranged' }),
            atk('dagger', { hand: 'off' }),
            atk('sword'),
            atk('axe')
        );

        expect(pickMeleeAttack(p)?.name).toBe('sword');
    });

    it('prefers the attack with the longest reach even when it is not first', () => {
        const p = withAttacks(atk('sword'), atk('glaive', { reachCells: 2 }));

        expect(pickMeleeAttack(p)?.name).toBe('glaive');
    });

    it('returns null with only ranged attacks or none', () => {
        expect(
            pickMeleeAttack(withAttacks(atk('bow', { type: 'ranged' })))
        ).toBe(null);
        expect(pickMeleeAttack(withAttacks())).toBeNull();
    });

    it('returns null when melee attacks are disabled', () => {
        const p = withAttacks(atk('sword'));

        p.battleData.activeEffects = [
            makeEffect('d', {
                effects: [{ type: 'disable_melee_attacks', value: 1 }],
            }),
        ];

        expect(pickMeleeAttack(p)).toBeNull();
    });
});
