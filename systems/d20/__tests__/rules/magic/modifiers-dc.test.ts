import { describe, expect, it } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { d20SpellSaveDc } from '@/systems/d20/rules/magic/save-dc';
import { d20SpellAttackBonus } from '@/systems/d20/rules/magic/spell-attack';
import type { BattleParticipant } from '@/types/battle';

const caster = (
    over: Partial<BattleParticipant['spellcasting']> = {},
    mods: Partial<BattleParticipant['abilities']['modifiers']> = {},
    prof = 3
): BattleParticipant => {
    const p = createMockParticipant();

    return {
        ...p,
        abilities: {
            ...p.abilities,
            proficiencyBonus: prof,
            modifiers: { ...p.abilities.modifiers, ...mods },
        },
        spellcasting: { ...p.spellcasting, ...over },
    };
};

describe('d20SpellSaveDc', () => {
    it.each([
        [2, 3, 8, 13],
        [0, 2, 8, 10],
        [4, 6, 8, 18],
        [-1, 2, 8, 9],
        [3, 3, 10, 16],
    ])('mod %i, prof %i, base %i gives DC %i', (mod, prof, base, dc) => {
        const p = caster(
            { spellcastingAbility: 'intelligence' },
            { intelligence: mod },
            prof
        );

        expect(d20SpellSaveDc(p, undefined, base)).toBe(dc);
    });

    it('an explicit ability overrides the caster ability and ignores the stored DC', () => {
        const p = caster(
            { spellcastingAbility: 'intelligence', spellSaveDC: 99 },
            { intelligence: 1, wisdom: 4 }
        );

        expect(d20SpellSaveDc(p, 'wisdom', 8)).toBe(15);
    });

    it('prefers the stored spellSaveDC when no ability is given', () => {
        const p = caster({
            spellcastingAbility: 'charisma',
            spellSaveDC: 17,
        });

        expect(d20SpellSaveDc(p, undefined, 8)).toBe(17);
    });

    it('with no casting ability the modifier is 0', () => {
        expect(d20SpellSaveDc(caster({}, {}, 2), undefined, 8)).toBe(10);
    });
});

describe('d20SpellAttackBonus', () => {
    it('uses the stored spell attack bonus first', () => {
        const p = caster({
            spellcastingAbility: 'wisdom',
            spellAttackBonus: 9,
        });

        expect(d20SpellAttackBonus(p, false)).toBe(9);
    });

    it('computes proficiency plus casting modifier otherwise', () => {
        const p = caster({ spellcastingAbility: 'wisdom' }, { wisdom: 4 });

        expect(d20SpellAttackBonus(p, false)).toBe(7);
    });

    it('a weapon cast without a casting ability uses the better of STR/DEX', () => {
        const p = caster({}, { strength: 1, dexterity: 4 });

        expect(d20SpellAttackBonus(p, true)).toBe(7);
    });

    it('a non-weapon cast without a casting ability is prof only', () => {
        expect(d20SpellAttackBonus(caster({}, {}, 4), false)).toBe(4);
    });
});
