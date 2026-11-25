import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from '../page';

const getAuthUserOptional = vi.fn();

vi.mock('@/lib/auth', () => ({
    getAuthUserOptional: () => getAuthUserOptional(),
}));

const redirect = vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
});

vi.mock('next/navigation', () => ({
    redirect: (url: string) => redirect(url),
}));
vi.mock('@/lib/utils/api/ops-access', () => ({ isOpsAdmin: () => false }));
vi.mock('../page-client', () => ({ ProfileClient: () => null }));

beforeEach(() => vi.clearAllMocks());

describe('/profile page', () => {
    it('redirects to sign-in when unauthenticated', async () => {
        getAuthUserOptional.mockResolvedValue(null);

        await expect(ProfilePage()).rejects.toThrow(
            'REDIRECT:/sign-in?next=/profile'
        );
    });

    it('renders for a signed-in user', async () => {
        getAuthUserOptional.mockResolvedValue({ id: 'u1', email: 'a@x.com' });

        await expect(ProfilePage()).resolves.toBeTruthy();
        expect(redirect).not.toHaveBeenCalled();
    });
});
