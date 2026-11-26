// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProfileClient } from '../page-client';

const state = vi.hoisted(() => ({
    user: null as null | object,
    signOut: vi.fn(),
    switchAccount: vi.fn(),
}));

vi.mock('@/lib/hooks/auth', () => ({
    useSessionUser: () => state.user,
    useProfileActions: () => ({
        signOut: state.signOut,
        switchAccount: state.switchAccount,
    }),
}));
vi.mock('@/components/profile/AvatarEditor', () => ({
    AvatarEditor: ({ children }: { children?: React.ReactNode }) => (
        <div data-testid="editor">{children}</div>
    ),
}));
vi.mock('@/components/profile/DeleteAccountSection', () => ({
    DeleteAccountSection: () => <div data-testid="delete-account" />,
}));
vi.mock('@/components/onboarding/OnboardingHint', () => ({
    OnboardingHint: ({ id }: { id: string }) => (
        <div data-testid={`hint-${id}`} />
    ),
}));
vi.mock('@/components/layout/PaletteSwitcher', () => ({
    PaletteSwitcher: () => <div data-testid="palettes" />,
}));
vi.mock('@/components/common/shell/LocaleSwitcher', () => ({
    LocaleSwitcher: () => <div data-testid="locale" />,
}));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));

afterEach(cleanup);

const summary = {
    campaigns: 0,
    characters: 0,
    lastActivity: null,
    recentCampaigns: [],
    recentCharacters: [],
};

const user = { id: 'u1', email: 'a@x.com', name: 'A', avatarUrl: null };

describe('ProfileClient', () => {
    it('shows loading without a session user', () => {
        state.user = null;

        render(
            <ProfileClient
                profile={{ now: Date.now(), showOpsLink: false, summary }}
            />
        );

        expect(screen.queryByTestId('editor')).toBeNull();
    });

    it('renders the editor and hint', () => {
        state.user = user;

        render(
            <ProfileClient
                profile={{ now: Date.now(), showOpsLink: false, summary }}
            />
        );

        expect(screen.getByTestId('hint-profile.avatar')).toBeTruthy();
        expect(screen.getByTestId('editor')).toBeTruthy();
    });

    it('shows the ops link only when allowed', () => {
        state.user = user;

        const { rerender } = render(
            <ProfileClient
                profile={{ now: Date.now(), showOpsLink: false, summary }}
            />
        );

        expect(screen.queryByText('opsLink')).toBeNull();

        rerender(
            <ProfileClient
                profile={{ now: Date.now(), showOpsLink: true, summary }}
            />
        );

        expect(screen.getByText('opsLink')).toBeTruthy();
    });

    it('omits zero counts and a missing date from the summary', () => {
        state.user = user;

        render(
            <ProfileClient
                profile={{
                    now: Date.now(),
                    showOpsLink: false,
                    summary: { ...summary, characters: 2 },
                }}
            />
        );

        expect(screen.getByText('2')).toBeTruthy();
        expect(screen.queryByText('campaigns')).toBeNull();
        expect(screen.queryByText('lastActivity')).toBeNull();
    });

    it('shows empty states with a link to campaigns', () => {
        state.user = user;

        render(
            <ProfileClient
                profile={{ now: Date.now(), showOpsLink: false, summary }}
            />
        );

        for (const link of screen.getAllByText('campaignsEmptyLink')) {
            expect(link.closest('a')?.getAttribute('href')).toBe('/campaigns');
        }
        expect(screen.getByText('heroesEmpty')).toBeTruthy();
    });

    it('renders recent campaigns and heroes as links', () => {
        state.user = user;

        render(
            <ProfileClient
                profile={{
                    now: Date.now(),
                    showOpsLink: false,
                    summary: {
                        ...summary,
                        recentCampaigns: [
                            {
                                id: 'c1',
                                name: 'Camp One',
                                role: 'dm',
                                updatedAt: '2026-11-20T10:00:00.000Z',
                            },
                        ],
                        recentCharacters: [
                            {
                                id: 'h1',
                                name: 'Hero One',
                                level: 3,
                                className: 'Wizard',
                                avatar: null,
                                campaignId: 'c1',
                                campaignName: 'Camp One',
                            },
                        ],
                    },
                }}
            />
        );

        expect(
            screen
                .getAllByRole('link')
                .some((a) => a.getAttribute('href') === '/campaigns/c1')
        ).toBe(true);
        expect(
            screen.getByText('Hero One').closest('a')?.getAttribute('href')
        ).toBe('/campaigns/c1/character');
        expect(screen.getByText('roleDm')).toBeTruthy();
    });

    it('signs out and switches account through the profile actions', () => {
        state.user = user;

        render(
            <ProfileClient
                profile={{ now: Date.now(), showOpsLink: false, summary }}
            />
        );

        fireEvent.click(screen.getByText('signOut'));
        fireEvent.click(screen.getByText('switchAccount'));

        expect(state.signOut).toHaveBeenCalledTimes(1);
        expect(state.switchAccount).toHaveBeenCalledTimes(1);
    });
});
