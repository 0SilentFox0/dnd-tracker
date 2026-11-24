import { describe, expect, it } from 'vitest';

import { heroSlotViews } from '../hero';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { PACT_KEY } from '@/lib/utils/spells/slot-keys';

const withSlots = (
    spellSlots: Record<string, { current: number; max: number; level?: number }>
) =>
    createMockParticipant({
        spellcasting: { spellSlots, knownSpells: [] },
    } as never);

describe('heroSlotViews', () => {
    it('always lists levels 1-5 for a caster with slots', () => {
        const views = heroSlotViews(withSlots({ '1': { current: 2, max: 4 } }));

        expect(views.map((v) => v.level)).toEqual([1, 2, 3, 4, 5]);
        expect(views[0]).toMatchObject({ roman: 'I', current: 2, max: 4 });
    });

    it('adds levels 6-9 only when max > 0', () => {
        const views = heroSlotViews(
            withSlots({
                '1': { current: 1, max: 1 },
                '6': { current: 1, max: 1 },
            })
        );

        expect(views.map((v) => v.level)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('appends the pact slot', () => {
        const views = heroSlotViews(
            withSlots({ [PACT_KEY]: { current: 1, max: 2, level: 3 } })
        );

        expect(views.at(-1)).toMatchObject({
            pact: true,
            level: 3,
            roman: 'III',
            current: 1,
            max: 2,
        });
    });

    it('returns nothing without spellcasting', () => {
        expect(heroSlotViews(createMockParticipant())).toEqual([]);
    });
});
