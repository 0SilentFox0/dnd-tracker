import { describe, expect, it } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { d20CasterDice } from '@/systems/d20/rules/magic/caster-dice';
import type { BattleParticipant } from '@/types/battle';

const caster = (level: number, model?: string) => {
    const p = createMockParticipant();

    return {
        ...p,
        abilities: { ...p.abilities, level, damageModel: model ?? '5e' },
    } as unknown as BattleParticipant;
};

type Spell = Parameters<typeof d20CasterDice>[1];

const spell = (over: Partial<Spell>): Spell =>
    ({ dice: 1, level: 0, dieSides: 10, ...over }) as Spell;

describe('d20CasterDice', () => {
    it('is null outside the 5e damage model', () => {
        expect(d20CasterDice(caster(5, 'flat'), spell({}), 0)).toBeNull();
    });

    it.each([
        [1, 1],
        [4, 1],
        [5, 2],
        [10, 2],
        [11, 3],
        [16, 3],
        [17, 4],
        [20, 4],
    ])('cantrip scales at level %i to %id', (level, count) => {
        expect(d20CasterDice(caster(level), spell({}), 0)).toEqual({
            count,
            sides: 10,
        });
    });

    it('leveled spells add upcast dice per slot level above base', () => {
        const s = spell({ dice: 8, level: 3, dieSides: 6, upcastDice: 1 });

        expect(d20CasterDice(caster(9), s, 3)).toEqual({ count: 8, sides: 6 });
        expect(d20CasterDice(caster(9), s, 5)).toEqual({ count: 10, sides: 6 });
    });

    it('fixedDice ignores upcasting and level scaling', () => {
        const s = spell({
            dice: 2,
            level: 0,
            fixedDice: true,
            upcastDice: 3,
        } as Partial<Spell>);

        expect(d20CasterDice(caster(20), s, 0)).toEqual({
            count: 2,
            sides: 10,
        });
    });
});
