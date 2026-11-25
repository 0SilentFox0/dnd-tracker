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
vi.mock('@/components/onboarding/OnboardingHint', () => ({
    OnboardingHint: ({ id }: { id: string }) => (
        <div data-testid={`hint-${id}`} />
    ),
}));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));

afterEach(cleanup);

const summary = { campaigns: 0, characters: 0, lastActivity: null };

const user = { id: 'u1', email: 'a@x.com', name: 'A', avatarUrl: null };

describe('ProfileClient', () => {
    it('shows loading without a session user', () => {
        state.user = null;

        render(<ProfileClient profile={{ showOpsLink: false, summary }} />);

        expect(screen.queryByTestId('editor')).toBeNull();
    });

    it('renders the editor and hint', () => {
        state.user = user;

        render(<ProfileClient profile={{ showOpsLink: false, summary }} />);

        expect(screen.getByTestId('hint-profile.avatar')).toBeTruthy();
        expect(screen.getByTestId('editor')).toBeTruthy();
    });

    it('shows the ops link only when allowed', () => {
        state.user = user;

        const { rerender } = render(
            <ProfileClient profile={{ showOpsLink: false, summary }} />
        );

        expect(screen.queryByText('opsLink')).toBeNull();

        rerender(<ProfileClient profile={{ showOpsLink: true, summary }} />);

        expect(screen.getByText('opsLink')).toBeTruthy();
    });

    it('omits zero counts and a missing date from the summary', () => {
        state.user = user;

        render(
            <ProfileClient
                profile={{
                    showOpsLink: false,
                    summary: { campaigns: 0, characters: 2, lastActivity: null },
                }}
            />
        );

        expect(screen.getByText('2')).toBeTruthy();
        expect(screen.queryByText('campaigns')).toBeNull();
        expect(screen.queryByText('lastActivity')).toBeNull();
    });

    it('signs out and switches account through the profile actions', () => {
        state.user = user;

        render(<ProfileClient profile={{ showOpsLink: false, summary }} />);

        fireEvent.click(screen.getByText('signOut'));
        fireEvent.click(screen.getByText('switchAccount'));

        expect(state.signOut).toHaveBeenCalledTimes(1);
        expect(state.switchAccount).toHaveBeenCalledTimes(1);
    });
});
