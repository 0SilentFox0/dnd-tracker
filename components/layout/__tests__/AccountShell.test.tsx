// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { accountActiveId,AccountShell } from '../AccountShell';

const nav = vi.hoisted(() => ({ path: '/settings/ai' }));

vi.mock('next/navigation', () => ({ usePathname: () => nav.path }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/hooks/auth', () => ({ useSessionUser: () => null }));
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

        expect(current).toHaveLength(2);
        expect(current.map((a) => a.getAttribute('href'))).toEqual([
            '/settings/ai',
            '/settings/ai',
        ]);
        expect(screen.getByText('body')).toBeTruthy();
    });

    it('renders the sidebar nav landmark with the active link', () => {
        nav.path = '/settings/password';

        render(
            <AccountShell>
                <p>body</p>
            </AccountShell>
        );

        const navs = screen.getAllByRole('navigation', { name: 'profile' });

        const sidebar = navs.find((n) => n.closest('aside'));

        expect(sidebar).toBeTruthy();

        const current = sidebar?.querySelector('[aria-current="page"]');

        expect(current?.getAttribute('href')).toBe('/settings/password');
    });

    it('drops the form page own phone padding so the shell gutter is the only one', () => {
        const { container } = render(
            <AccountShell>
                <div className="hud-form-page" />
            </AccountShell>
        );

        const cls = container.querySelector('main')?.className ?? '';

        expect(cls).not.toContain('-mx-4');
        expect(cls).toContain('.hud-form-head>*]:!px-0');
    });
});
