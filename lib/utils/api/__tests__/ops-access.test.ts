import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isOpsAdmin } from '../ops-access';

afterEach(() => vi.unstubAllEnvs());

describe('isOpsAdmin', () => {
    it('matches an allowed email case-insensitively', () => {
        vi.stubEnv('OPS_ADMIN_EMAILS', ' A@x.com , b@x.com ');

        expect(isOpsAdmin({ id: 'u', email: 'a@X.com' })).toBe(true);
    });

    it('falls back to platform admin ids', () => {
        vi.stubEnv('OPS_ADMIN_EMAILS', '');
        vi.stubEnv('PLATFORM_ADMIN_USER_IDS', 'u1');

        expect(isOpsAdmin({ id: 'u1', email: null })).toBe(true);
    });

    it('rejects everyone else, including with no email', () => {
        vi.stubEnv('OPS_ADMIN_EMAILS', 'a@x.com');
        vi.stubEnv('PLATFORM_ADMIN_USER_IDS', '');

        expect(isOpsAdmin({ id: 'u', email: 'c@x.com' })).toBe(false);
        expect(isOpsAdmin({ id: 'u', email: null })).toBe(false);
    });
});
