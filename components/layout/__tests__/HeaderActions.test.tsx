// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    isAdmin: false,
    user: { email: 'a@x.com' } as { email: string } | null,
}));

const useIsAdmin = vi.hoisted(() => vi.fn());

vi.mock('@/lib/hooks/admin', () => ({ useIsAdmin }));
vi.mock('@/lib/hooks/auth', () => ({ useSessionUser: () => state.user }));
vi.mock('@/components/auth/UserAvatar', () => ({ UserAvatar: () => null }));
vi.mock('@/components/campaigns/JoinBattleButton', () => ({
    JoinBattleButton: () => null,
}));
vi.mock('@/components/campaigns/WatchShowButton', () => ({
    WatchShowButton: () => null,
}));
vi.mock('@/components/layout/AbbreviationsInfoDialog', () => ({
    AbbreviationsInfoDialog: () => null,
}));
vi.mock('@/components/onboarding/WhatsNewButton', () => ({
    WhatsNewButton: () => null,
}));

import { HeaderActions } from '@/components/layout/HeaderActions';

afterEach(cleanup);

describe('HeaderActions admin link', () => {
    beforeEach(() => {
        state.user = { id: 'u1', email: 'a@x.com' };
        useIsAdmin.mockReset().mockImplementation(() => state.isAdmin);
    });

    it('links to /admin for an admin', () => {
        state.isAdmin = true;

        render(<HeaderActions />);

        expect(
            screen.getByText('common.header.adminLink').closest('a')?.getAttribute('href')
        ).toBe('/admin');
    });

    it('hides the link for a non-admin', () => {
        state.isAdmin = false;

        render(<HeaderActions />);

        expect(screen.queryByText('common.header.adminLink')).toBeNull();
    });

    it('does not query without a signed-in email', () => {
        state.user = null;

        render(<HeaderActions />);

        expect(useIsAdmin).toHaveBeenCalledWith(undefined);
    });
});
