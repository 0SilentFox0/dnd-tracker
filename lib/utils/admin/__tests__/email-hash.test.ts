import { describe, expect, it } from 'vitest';

import { hashEmail } from '../email-hash';

describe('hashEmail', () => {
    it('normalises case and whitespace', () => {
        expect(hashEmail(' A@B.com ', 's')).toBe(hashEmail('a@b.com', 's'));
        expect(hashEmail('a@b.com', 's')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('depends on the secret', () => {
        expect(hashEmail('a@b.com', 's1')).not.toBe(hashEmail('a@b.com', 's2'));
    });

    it('returns null without a secret', () => {
        expect(hashEmail('a@b.com', undefined)).toBeNull();
        expect(hashEmail('a@b.com', '')).toBeNull();
    });
});
