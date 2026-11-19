import { describe, expect, it } from 'vitest';

import { avatarHue, avatarInitials } from '@/lib/utils/auth/avatar';

describe('avatarInitials', () => {
    it.each([
        ['Anna Kovalenko', null, 'AK'],
        ['anna', null, 'A'],
        ['  Іван  Петрович  Сидоренко ', null, 'ІП'],
        [null, 'john.smith@x.com', 'J'],
        ['', 'zed@x.com', 'Z'],
        [null, null, '?'],
        ['', '', '?'],
        ['😀 Bob', null, '😀B'],
        ['e\u0301lise', null, 'E\u0301'],
        ['🇺🇦 Bob', null, '🇺🇦B'],
        ['👨‍👩‍👧 Bob', null, '👨‍👩‍👧B'],
        ['👍🏽 Bob', null, '👍🏽B'],
        ['Anna', null, 'A'],
    ])('%s / %s → %s', (name, email, out) => {
        expect(avatarInitials(name, email)).toBe(out);
    });
});

describe('avatarHue', () => {
    it('is stable and within 0..359', () => {
        const h = avatarHue('3f1c-user');

        expect(h).toBe(avatarHue('3f1c-user'));
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(360);
    });

    it('differs for different ids', () => {
        expect(avatarHue('a')).not.toBe(avatarHue('b'));
    });
});
