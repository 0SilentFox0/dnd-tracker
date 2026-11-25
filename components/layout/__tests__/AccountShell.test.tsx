// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { accountActiveId,AccountShell } from '../AccountShell';

const nav = vi.hoisted(() => ({ path: '/settings/ai' }));

vi.mock('next/navigation', () => ({ usePathname: () => nav.path }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/layout/GameShellClient', () => ({
    GameShellClient: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
}));

afterEach(cleanup);

describe('accountActiveId', () => {
    it('matches the longest href prefix and defaults to profile', () => {
        expect(accountActiveId('/settings/ai')).toBe('aiKeys');
        expect(accountActiveId('/help/combat')).toBe('help');
        expect(accountActiveId('/profile')).toBe('profile');
        expect(accountActiveId('/settings/subscription')).toBe('subscription');
        expect(accountActiveId('/elsewhere')).toBe('profile');
    });
});

describe('AccountShell', () => {
    it('marks the current section link with aria-current', () => {
        nav.path = '/settings/ai';

        render(
            <AccountShell>
                <p>body</p>
            </AccountShell>
        );

        const current = screen
            .getAllByRole('link')
            .filter((a) => a.getAttribute('aria-current') === 'page');

        expect(current).toHaveLength(1);
        expect(current[0].getAttribute('href')).toBe('/settings/ai');
        expect(screen.getByText('body')).toBeTruthy();
    });
});
