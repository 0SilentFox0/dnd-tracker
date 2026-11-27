// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SecurityClient } from '../security/security-client';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { AdminSecurity } from '@/types/admin';

vi.unmock('next-intl');

const state = vi.hoisted(() => ({ data: null as AdminSecurity | null }));

vi.mock('@/lib/hooks/admin', () => ({
    useAdminSecurity: () => ({
        data: state.data,
        isPending: false,
        isError: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
    }),
}));

const account = (userId: string) => ({
    userId,
    device: 'Chrome',
    days: 3,
    displayName: `Name ${userId}`,
    email: `${userId}@example.test`,
});

const render = () =>
    renderWithIntl(<SecurityClient />, {
        locale: 'en',
        namespaces: ['common', 'admin'],
    });

afterEach(cleanup);

describe('SecurityClient', () => {
    it('shows empty states for all three sections', async () => {
        state.data = { days: 30, groups: [], reRegistrations: [], actions: [] };

        await render();

        expect(screen.getByText(/No IP is shared/)).toBeTruthy();
        expect(screen.getByText('No re-registrations found.')).toBeTruthy();
        expect(screen.getByText('No admin actions yet.')).toBeTruthy();
    });

    it('labels crowd groups and links accounts to the user card', async () => {
        state.data = {
            days: 30,
            groups: [
                {
                    ip: '1.1.1.1',
                    country: 'UA',
                    sharedDays: 2,
                    crowd: true,
                    accounts: [account('u1'), account('u2')],
                },
                {
                    ip: '2.2.2.2',
                    country: null,
                    sharedDays: 0,
                    crowd: false,
                    accounts: [account('u3'), account('u4')],
                },
            ],
            reRegistrations: [],
            actions: [],
        };

        await render();

        expect(screen.getAllByText('likely NAT/VPN')).toHaveLength(1);
        expect(
            screen
                .getByText('Name u1 (u1@example.test)')
                .closest('a')
                ?.getAttribute('href')
        ).toBe('/admin/users/u1');
    });
});
