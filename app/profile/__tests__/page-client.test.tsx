// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProfileClient } from '../page-client';

import { PROFILE_MENU } from '@/components/layout/profile-menu';

const state = vi.hoisted(() => ({
    user: null as null | object,
    actions: { switchAccount: vi.fn(), signOut: vi.fn() },
}));

vi.mock('@/lib/hooks/auth', () => ({
    useSessionUser: () => state.user,
    useProfileActions: () => state.actions,
}));
vi.mock('@/components/profile/AvatarEditor', () => ({
    AvatarEditor: () => <div data-testid="editor" />,
}));
vi.mock('@/components/onboarding/OnboardingHint', () => ({
    OnboardingHint: ({ id }: { id: string }) => <div data-testid={`hint-${id}`} />,
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('ProfileClient', () => {
    it('shows loading without a session user', () => {
        state.user = null;

        render(<ProfileClient />);

        expect(screen.queryByTestId('editor')).toBeNull();
    });

    it('renders an entry per registry id and wires the actions', () => {
        state.user = { id: 'u1', email: 'a@x.com', name: 'Anna', avatarUrl: null };

        render(<ProfileClient />);

        expect(screen.getByTestId('hint-profile.avatar')).toBeTruthy();

        for (const entry of PROFILE_MENU)
            expect(screen.getByText(entry.labelKey)).toBeTruthy();

        fireEvent.click(screen.getByText('signOut'));
        fireEvent.click(screen.getByText('switchAccount'));

        expect(state.actions.signOut).toHaveBeenCalled();
        expect(state.actions.switchAccount).toHaveBeenCalled();
    });
});
