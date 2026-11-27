// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UsersClient } from '../users/users-client';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { AdminUserRow } from '@/types/admin';

vi.unmock('next-intl');

const row = (over: Partial<AdminUserRow>): AdminUserRow => ({
    id: 'u1',
    email: 'a@example.test',
    displayName: 'Alice',
    avatar: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    lastActiveAt: null,
    lastSignInAt: null,
    bannedUntil: null,
    campaignsDm: 1,
    templates: 0,
    memberships: 0,
    characters: 0,
    country: null,
    sharedIp: false,
    subscription: null,
    ...over,
});

const state = vi.hoisted(() => ({
    authMetaAvailable: true,
    rows: [] as AdminUserRow[],
}));

vi.mock('@/lib/hooks/admin', () => ({
    useAdminUsers: () => ({
        data: {
            pages: [
                {
                    rows: state.rows,
                    next: null,
                    authMetaAvailable: state.authMetaAvailable,
                },
            ],
        },
        isPending: false,
        isError: false,
        isFetching: false,
        error: null,
        hasNextPage: false,
        refetch: vi.fn(),
    }),
}));

const render = () =>
    renderWithIntl(<UsersClient />, {
        locale: 'en',
        namespaces: ['common', 'admin'],
    });

afterEach(cleanup);

describe('UsersClient', () => {
    it('shows the shared IP badge and a dash in the subscription column', async () => {
        state.authMetaAvailable = true;
        state.rows = [row({ sharedIp: true })];

        const { container } = await render();

        expect(
            screen.getByText('Shared IP', { selector: 'span' })
        ).toBeTruthy();
        expect(
            container.querySelector('tbody td:last-child')?.textContent
        ).toBe('—');
    });

    it('shows n/a for auth-derived columns when auth meta is unavailable', async () => {
        state.authMetaAvailable = false;
        state.rows = [row({})];

        await render();

        expect(screen.getAllByText('n/a')).toHaveLength(2);
    });
});
