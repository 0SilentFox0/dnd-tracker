// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OverviewClient } from '../overview-client';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { AdminOverview } from '@/types/admin';

vi.unmock('next-intl');

vi.mock('next/dynamic', () => ({ default: () => () => null }));

const days = ['2026-03-01', '2026-03-02'];

const data: AdminOverview = {
    range: '30d',
    dataSince: '2026-02-01',
    tiles: {
        usersTotal: 10,
        usersNew: { value: 3, delta: 0.5 },
        usersDeleted: { value: 1, delta: null },
        netGrowth: 2,
        dau: 2,
        wau: 5,
        mau: 8,
        stickiness: 0.25,
        campaignsTotal: 4,
        campaignsNew: { value: 1, delta: 0 },
        templatesTotal: 2,
        battles: { value: 6, delta: -0.2 },
        withAiKey: 1,
        activationRate: null,
    },
    series: {
        days,
        signups: [1, 2],
        deletions: [0, 1],
        usersTotal: [9, 10],
        dau: [1, 2],
        wau: [3, 5],
        mau: [6, 8],
        campaigns: [0, 1],
        battles: [2, 4],
        characters: [1, 1],
    },
    cohorts: [{ cohortWeek: '2026-02-23', size: 3, rates: [0.33, null, null] }],
    breakdowns: {
        locale: [
            { key: 'uk', n: 6 },
            { key: 'none', n: 1 },
        ],
        system: [{ key: 'dnd5e', n: 3 }],
        country: [{ key: 'UA', n: 4 }],
    },
};

vi.mock('@/lib/hooks/admin', () => ({
    adminKeys: {},
    useAdminOverview: () => ({
        data,
        isPending: false,
        isError: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
    }),
}));

afterEach(cleanup);

describe('OverviewClient', () => {
    it('renders without raw translation keys', async () => {
        const { container } = await renderWithIntl(<OverviewClient />, {
            locale: 'en',
            namespaces: ['common', 'admin'],
        });

        expect(screen.getByText('New users')).toBeTruthy();
        expect(screen.getByText('Not connected')).toBeTruthy();
        expect(screen.getByText('Data since 2026-02-01')).toBeTruthy();
        expect(container.textContent).not.toMatch(/admin\.|overview\./);
    });
});
