import { describe, expect, it } from 'vitest';

import {
    activeMastery,
    attackIsKind,
    trainedKinds,
    weaponMasteryOf,
} from '../mastery';
import { markUsedThisTurn, usedThisTurn } from '../once';

import { AttackType } from '@/lib/constants/battle';
import {
    makeParticipant,
    resolved,
} from '@/lib/utils/abilities/__tests__/fixtures';
import type { BattleAttack } from '@/types/battle';

const weapon = (name: string, properties?: string): BattleAttack => ({
    id: name,
    name,
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '1d8',
    damageType: 'slashing',
    properties,
});

const trained = (...kinds: string[]) =>
    makeParticipant({
        id: 'p',
        abilities: [
            resolved({
                trigger: { event: 'passive' },
                params: { weaponMastery: kinds },
                effects: [{ kind: 'note', text: 'Mastery' }],
            }),
        ],
    });

describe('weaponMasteryOf', () => {
    it.each([
        ['Heavy. Mastery: Topple', 'topple'],
        ['Mastery: Nick', 'nick'],
        ['mastery: CLEAVE', 'cleave'],
        ['Heavy', null],
        [undefined, null],
        ['Mastery: Bash', null],
    ])('%j -> %j', (properties, expected) => {
        expect(weaponMasteryOf({ properties })).toBe(expected);
    });
});

describe('attackIsKind', () => {
    it('matches the base kind of magic variants but not other kinds', () => {
        expect(attackIsKind({ name: 'Longsword' }, 'longsword')).toBe(true);
        expect(attackIsKind({ name: '+1 Longsword' }, 'longsword')).toBe(true);
        expect(attackIsKind({ name: 'Mace of Terror' }, 'mace')).toBe(true);
        expect(attackIsKind({ name: 'Shortsword' }, 'longsword')).toBe(false);
        expect(attackIsKind({ name: 'Greatclub' }, 'club')).toBe(false);
        expect(attackIsKind({ name: 'Hand Crossbow' }, 'hand-crossbow')).toBe(
            true
        );
    });
});

describe('activeMastery', () => {
    const sword = weapon('Longsword', 'Mastery: Sap');

    it('needs both the weapon property and the trained kind', () => {
        expect(activeMastery(trained('longsword'), sword)).toBe('sap');
        expect(activeMastery(trained('mace'), sword)).toBeNull();
        expect(
            activeMastery(trained('longsword'), weapon('Longsword'))
        ).toBeNull();
        expect(activeMastery(makeParticipant({ id: 'x' }), sword)).toBeNull();
    });

    it('collects trained kinds from every ability', () => {
        expect(trainedKinds(trained('longsword', 'dagger'))).toEqual([
            'longsword',
            'dagger',
        ]);
    });
});

describe('once per turn marker', () => {
    it('is set by markUsedThisTurn and per mastery', () => {
        const p = makeParticipant({ id: 'p' });

        expect(usedThisTurn(p, 'cleave')).toBe(false);

        const marked = markUsedThisTurn(p, 'cleave', 1);

        expect(usedThisTurn(marked, 'cleave')).toBe(true);
        expect(usedThisTurn(marked, 'nick')).toBe(false);
    });
});
