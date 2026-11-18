import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { isTokenActive } from '../api-tokens';

describe('isTokenActive', () => {
    const now = 1_000_000;

    it('is active without revocation or expiry', () => {
        expect(isTokenActive({ revokedAt: null, expiresAt: null }, now)).toBe(true);
    });

    it('is inactive when revoked', () => {
        expect(isTokenActive({ revokedAt: new Date(1), expiresAt: null }, now)).toBe(false);
    });

    it('is inactive at or after expiry, active before', () => {
        expect(isTokenActive({ revokedAt: null, expiresAt: new Date(now) }, now)).toBe(false);
        expect(isTokenActive({ revokedAt: null, expiresAt: new Date(now - 1) }, now)).toBe(false);
        expect(isTokenActive({ revokedAt: null, expiresAt: new Date(now + 1) }, now)).toBe(true);
    });
});
