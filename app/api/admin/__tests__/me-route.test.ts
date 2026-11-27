import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const getAuthUserOptional = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getAuthUserOptional }));

import { GET } from '@/app/api/admin/me/route';

describe('GET /api/admin/me', () => {
    beforeEach(() => {
        getAuthUserOptional.mockReset();
        vi.stubEnv('PLATFORM_ADMIN_USER_IDS', 'owner');
        vi.stubEnv('OPS_ADMIN_EMAILS', 'ok@x.com');
    });

    it.each([
        [null, false],
        [{ id: 'x', email: 'no@x.com' }, false],
        [{ id: 'owner', email: null }, true],
        [{ id: 'y', email: 'OK@x.com' }, true],
    ])('%j -> %s', async (user, expected) => {
        getAuthUserOptional.mockResolvedValue(user);

        expect(await (await GET()).json()).toEqual({ isAdmin: expected });
    });
});
