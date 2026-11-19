import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from '../page';

const getSessionUserId = vi.fn();

vi.mock('@/lib/auth', () => ({
    getSessionUserId: () => getSessionUserId(),
}));

const redirect = vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
});

vi.mock('next/navigation', () => ({
    redirect: (url: string) => redirect(url),
}));
vi.mock('../page-client', () => ({ ProfileClient: () => null }));

beforeEach(() => vi.clearAllMocks());

describe('/profile page', () => {
    it('redirects to sign-in when unauthenticated', async () => {
        getSessionUserId.mockResolvedValue(null);

        await expect(ProfilePage()).rejects.toThrow(
            'REDIRECT:/sign-in?next=/profile'
        );
    });

    it('renders for a signed-in user', async () => {
        getSessionUserId.mockResolvedValue('u1');

        await expect(ProfilePage()).resolves.toBeTruthy();
        expect(redirect).not.toHaveBeenCalled();
    });
});
