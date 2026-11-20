import { describe, expect, it } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { soulLostGuard } from '@/systems/wfrp/server/join-guard';

describe('soulLostGuard', () => {
    it('blocks a character whose soul is lost', () => {
        expect(
            soulLostGuard({
                characteristics: { corruption: { points: 3, soulLost: 'mental' } },
            })
        ).toBe(API_ERRORS.BATTLE_CHARACTER_SOUL_LOST);
    });

    it('allows others', () => {
        expect(
            soulLostGuard({ characteristics: { corruption: { points: 3 } } })
        ).toBeUndefined();
        expect(soulLostGuard({ characteristics: null })).toBeUndefined();
    });
});
