// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProfileClient } from '../page-client';

const state = vi.hoisted(() => ({
    user: null as null | object,
}));

vi.mock('@/lib/hooks/auth', () => ({
    useSessionUser: () => state.user,
}));
vi.mock('@/components/profile/AvatarEditor', () => ({
    AvatarEditor: () => <div data-testid="editor" />,
}));
vi.mock('@/components/onboarding/OnboardingHint', () => ({
    OnboardingHint: ({ id }: { id: string }) => (
        <div data-testid={`hint-${id}`} />
    ),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('ProfileClient', () => {
    it('shows loading without a session user', () => {
        state.user = null;

        render(<ProfileClient showOpsLink={false} />);

        expect(screen.queryByTestId('editor')).toBeNull();
    });

    it('renders the editor and hint', () => {
        state.user = {
            id: 'u1',
            email: 'a@x.com',
            name: 'Anna',
            avatarUrl: null,
        };

        render(<ProfileClient showOpsLink={false} />);

        expect(screen.getByTestId('hint-profile.avatar')).toBeTruthy();
    });

    it('shows the ops link only when allowed', () => {
        state.user = { id: 'u1', email: 'a@x.com', name: 'A', avatarUrl: null };

        const { rerender } = render(<ProfileClient showOpsLink={false} />);

        expect(screen.queryByText('opsLink')).toBeNull();

        rerender(<ProfileClient showOpsLink />);

        expect(screen.getByText('opsLink')).toBeTruthy();
    });
});
