import { describe, expect, it } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { D20_SPELL_RESOURCE } from '@/systems/d20/rules/magic/resource';
import type { BattleParticipant } from '@/types/battle';

const caster = (
    slots: BattleParticipant['spellcasting']['spellSlots']
): BattleParticipant => {
    const p = createMockParticipant();

    return { ...p, spellcasting: { ...p.spellcasting, spellSlots: slots } };
};

describe('D20_SPELL_RESOURCE.canCast', () => {
    it('cantrips never need a slot', () => {
        expect(D20_SPELL_RESOURCE.canCast(caster({}), { level: 0 })).toEqual({
            ok: true,
        });
    });

    it('needs a free slot of the spell level', () => {
        const p = caster({ '1': { max: 2, current: 1 } });

        expect(D20_SPELL_RESOURCE.canCast(p, { level: 1 })).toEqual({
            ok: true,
        });
    });

    it('fails with no free slot', () => {
        const p = caster({ '1': { max: 2, current: 0 } });

        expect(D20_SPELL_RESOURCE.canCast(p, { level: 1 })).toEqual({
            ok: false,
            error: API_ERRORS.BATTLE_NO_FREE_SLOT_TO_CAST,
        });
    });

    it('an upcast into a higher slot reports the cast level', () => {
        const p = caster({ '3': { max: 1, current: 1 } });

        expect(
            D20_SPELL_RESOURCE.canCast(p, { level: 1, slotKey: '3' })
        ).toEqual({ ok: true, castLevel: 3 });
    });

    it.each([
        ['missing slot', {}, '2', API_ERRORS.SLOT_MISSING],
        [
            'slot below the spell level',
            { '1': { max: 2, current: 2 } },
            '1',
            API_ERRORS.SLOT_TOO_LOW,
        ],
        [
            'empty slot',
            { '2': { max: 2, current: 0 } },
            '2',
            API_ERRORS.SLOT_EMPTY,
        ],
    ])('chosen slot: %s', (_n, slots, key, error) => {
        expect(
            D20_SPELL_RESOURCE.canCast(caster(slots), {
                level: 2,
                slotKey: key,
            })
        ).toEqual({ ok: false, error });
    });
});

describe('D20_SPELL_RESOURCE.spend', () => {
    it('decrements the slot of the spell level without mutating', () => {
        const p = caster({ '2': { max: 3, current: 2 } });

        const spent = D20_SPELL_RESOURCE.spend(p, { level: 2 });

        expect(spent.spellcasting.spellSlots['2'].current).toBe(1);
        expect(p.spellcasting.spellSlots['2'].current).toBe(2);
    });

    it('decrements the chosen slot key', () => {
        const p = caster({
            '1': { max: 2, current: 2 },
            '4': { max: 1, current: 1 },
        });

        const spent = D20_SPELL_RESOURCE.spend(p, { level: 1, slotKey: '4' });

        expect(spent.spellcasting.spellSlots['4'].current).toBe(0);
        expect(spent.spellcasting.spellSlots['1'].current).toBe(2);
    });

    it('cantrips and unknown slots leave the caster unchanged', () => {
        const p = caster({ '1': { max: 1, current: 1 } });

        expect(D20_SPELL_RESOURCE.spend(p, { level: 0 })).toBe(p);
        expect(D20_SPELL_RESOURCE.spend(p, { level: 5 })).toBe(p);
    });

    it('falls back to the pact slot when the normal one is empty', () => {
        const p = caster({
            '1': { max: 1, current: 0 },
            pact: { max: 2, current: 2, level: 2 },
        });

        const spent = D20_SPELL_RESOURCE.spend(p, { level: 1 });

        expect(spent.spellcasting.spellSlots.pact.current).toBe(1);
    });
});

describe('D20_SPELL_RESOURCE.picksSlot', () => {
    it('is on only for the 5e damage model', () => {
        const p = createMockParticipant();

        expect(D20_SPELL_RESOURCE.picksSlot?.(p)).toBe(false);
        expect(
            D20_SPELL_RESOURCE.picksSlot?.({
                ...p,
                abilities: { ...p.abilities, damageModel: '5e' },
            })
        ).toBe(true);
    });
});
