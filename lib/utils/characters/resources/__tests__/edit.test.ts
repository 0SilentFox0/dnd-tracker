import { describe, expect, it } from 'vitest';

import { editResources } from '@/lib/utils/characters/resources/edit';

describe('editResources', () => {
    it('reset clears everything', () => {
        expect(
            editResources({ hp: 3, dead: true, exhaustion: 2 }, { reset: true })
        ).toEqual({});
    });

    it('hp at or above max means full', () => {
        expect(editResources({ hp: 3 }, { hp: 30 }, 30)).toEqual({});
        expect(editResources({}, { hp: 12 }, 30)).toEqual({ hp: 12 });
    });

    it('kill and revive', () => {
        expect(editResources({ hp: 9, tempHp: 4 }, { dead: true })).toEqual({
            dead: true,
            hp: 0,
        });
        expect(editResources({ dead: true, hp: 0 }, { dead: false })).toEqual({
            hp: 1,
        });
    });

    it('exhaustion 0 removes the field, other fields kept', () => {
        expect(
            editResources(
                { exhaustion: 3, slotsSpent: { '1': 1 } },
                { exhaustion: 0 }
            )
        ).toEqual({ slotsSpent: { '1': 1 } });
    });
});

describe('editResources: slotsSpent', () => {
    const slotMax = { '1': 4, '2': 2, pact: 2 };

    it('sets spent per slot, clamps to max, 0 removes the key, unknown slots are ignored', () => {
        expect(
            editResources(
                {},
                { slotsSpent: { '1': 9 } },
                undefined,
                {},
                {
                    slotMax,
                }
            ).slotsSpent
        ).toEqual({ '1': 4 });
        expect(
            editResources(
                { slotsSpent: { '1': 3, '2': 1 } },
                { slotsSpent: { '1': 0, '3': 1 } },
                undefined,
                {},
                { slotMax }
            )
        ).toEqual({ slotsSpent: { '2': 1 } });
        expect(
            editResources(
                {},
                { slotsSpent: { pact: 1 } },
                undefined,
                {},
                {
                    slotMax,
                }
            ).slotsSpent
        ).toEqual({ pact: 1 });
    });

    it('does nothing without slot limits', () => {
        expect(
            editResources({}, { slotsSpent: { '1': 1 } }, undefined, {}, {})
        ).toEqual({});
    });
});
