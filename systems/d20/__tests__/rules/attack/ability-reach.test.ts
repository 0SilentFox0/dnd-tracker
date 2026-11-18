import { describe, expect, it } from 'vitest';

import {
    createMockParticipant,
    grantPassive,
} from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import {
    D20_REACH,
    d20AttackAbility,
} from '@/systems/d20/rules/attack/ability';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const hero = (str: number, dex: number): BattleParticipant => {
    const p = createMockParticipant();

    return {
        ...p,
        abilities: {
            ...p.abilities,
            damageModel: '5e',
            strength: str,
            dexterity: dex,
        },
    };
};

const weapon = (over: Partial<BattleAttack> = {}): BattleAttack => ({
    name: 'w',
    type: 'melee',
    attackBonus: 0,
    damageDice: '1d6',
    damageType: 'slashing',
    ...over,
});

describe('d20AttackAbility (5e)', () => {
    it.each([
        ['melee uses STR', weapon(), 16, 12, 'strength', 3],
        ['ranged uses DEX', weapon({ type: 'ranged' }), 16, 14, 'dexterity', 2],
        [
            'finesse picks DEX when higher',
            weapon({ traits: ['finesse'] }),
            10,
            16,
            'dexterity',
            3,
        ],
        [
            'finesse keeps STR on a tie',
            weapon({ traits: ['finesse'] }),
            14,
            14,
            'strength',
            2,
        ],
        ['negative modifier passes through', weapon(), 8, 10, 'strength', -1],
    ] as const)('%s', (_n, attack, str, dex, key, mod) => {
        const p = hero(str, dex);

        expect(d20AttackAbility(p, attack, [p])).toEqual({
            key,
            roll: mod,
            damage: mod,
        });
    });

    it('off-hand damage modifier is capped at 0 without two-weapon fighting', () => {
        const p = hero(16, 10);

        expect(d20AttackAbility(p, weapon({ hand: 'off' }), [p])).toEqual({
            key: 'strength',
            roll: 3,
            damage: 0,
        });
    });

    it('off-hand keeps a negative modifier', () => {
        const p = hero(8, 10);

        expect(d20AttackAbility(p, weapon({ hand: 'off' }), [p]).damage).toBe(
            -1
        );
    });

    it('two-weapon fighting lifts the off-hand cap', () => {
        const p = grantPassive(hero(16, 10), [
            { kind: 'flag', flag: 'twoWeaponFighting' },
        ]);

        expect(d20AttackAbility(p, weapon({ hand: 'off' }), [p]).damage).toBe(
            3
        );
    });
});

describe('D20_REACH', () => {
    it('reach weapons hit 2 cells, others 1', () => {
        const p = hero(10, 10);

        expect(D20_REACH.meleeCells(p, weapon({ traits: ['reach'] }))).toBe(2);
        expect(D20_REACH.meleeCells(p, weapon())).toBe(1);
    });

    it('ranged penalties apply only to the 5e damage model', () => {
        const other = {
            ...hero(10, 10),
        };

        other.abilities = { ...other.abilities, damageModel: undefined };

        expect(D20_REACH.rangedPenalties(hero(10, 10))).toBe(true);
        expect(D20_REACH.rangedPenalties(other)).toBe(false);
    });
});
