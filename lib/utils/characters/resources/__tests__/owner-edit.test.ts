import { describe, expect, it } from 'vitest';

import { ownerMayEdit } from '@/lib/utils/characters/resources/owner-edit';

describe('ownerMayEdit', () => {
    it('allows hp, temp hp and spell slots', () => {
        expect(ownerMayEdit({ hp: 3 })).toBe(true);
        expect(ownerMayEdit({ hp: 3, tempHp: 2, slotsSpent: { '1': 1 } })).toBe(
            true
        );
    });

    it('rejects DM-only fields even next to allowed ones', () => {
        expect(ownerMayEdit({ dead: false })).toBe(false);
        expect(ownerMayEdit({ hp: 1, exhaustion: 2 })).toBe(false);
        expect(ownerMayEdit({ reset: true })).toBe(false);
        expect(ownerMayEdit({ charges: { a: 1 } })).toBe(false);
    });
});
