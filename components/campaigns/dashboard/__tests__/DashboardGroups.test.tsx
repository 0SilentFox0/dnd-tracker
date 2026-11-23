// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardGroups } from '@/components/campaigns/dashboard/DashboardGroups';
import { useNotifications } from '@/lib/hooks/notifications';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import { parseRules } from '@/lib/utils/rules/schema';

// real uk messages
vi.unmock('next-intl');

vi.mock('@/lib/hooks/notifications', () => ({
    useNotifications: vi.fn(() => ({ data: undefined })),
}));

beforeEach(() => {
    vi.mocked(useNotifications).mockReturnValue({ data: undefined } as never);
});

afterEach(cleanup);

const NAMESPACES = ['common', 'validation', 'dashboard'] as const;

const render = (ui: React.ReactElement) =>
    renderWithIntl(ui, { namespaces: NAMESPACES });

const tileLinks = () => screen.getAllByRole('link');

const FULL_CONTEXT = {
    isTemplate: false,
    classesEnabled: false,
    system: parseRules({ system: { key: 'homm' } }).system,
};

describe('DashboardGroups', () => {
    it('DM page hosting its blocks shows only libraries and the reference', async () => {
        const { container } = await render(
            <DashboardGroups
                campaignId="c1"
                isDM
                pendingDrafts={0}
                context={FULL_CONTEXT}
                hostsDmBlocks
            />
        );

        expect(screen.getByRole('heading', { name: 'Бібліотеки' })).toBeTruthy();
        expect(screen.getByText('Довідник')).toBeTruthy();
        expect(screen.queryByText('Сценарій')).toBeNull();
        expect(screen.queryByText('Персонажі')).toBeNull();
        expect(container.querySelector('[data-tour="dashboard.search"]')).toBeNull();
        expect(
            container.querySelector('[data-tour="dashboard.sections"]')
        ).toBeNull();
    });

    it('without hosted blocks the DM still reaches every section', async () => {
        await render(
            <DashboardGroups
                campaignId="c1"
                isDM
                pendingDrafts={0}
                context={FULL_CONTEXT}
            />
        );

        for (const t of ['Сценарій', 'Персонажі', 'Юніти'])
            expect(screen.getByText(t)).toBeTruthy();
    });

    it('shows pending drafts in the characters subtitle', async () => {
        await render(
            <DashboardGroups campaignId="c1" isDM pendingDrafts={2} />
        );

        expect(screen.getByText(/2 на схваленні/)).toBeTruthy();
    });

    it('player sees own sections under a single heading', async () => {
        await render(
            <DashboardGroups campaignId="c1" isDM={false} pendingDrafts={0} />
        );

        for (const t of ['Мій персонаж', 'Показ', 'Карта', 'Довідник'])
            expect(screen.getByText(t)).toBeTruthy();

        expect(screen.queryByText('Юніти')).toBeNull();
        expect(screen.getAllByRole('heading')).toHaveLength(1);
    });

    it('hides the world tile for the keys the page hides', async () => {
        await render(
            <DashboardGroups
                campaignId="c1"
                isDM={false}
                pendingDrafts={0}
                hiddenKeys={['player-world']}
            />
        );

        expect(screen.queryByText('Карта')).toBeNull();
        expect(screen.getByText('Показ')).toBeTruthy();
        expect(tileLinks()).toHaveLength(4);
    });

    it('player with unread item sees a pill on the character tile', async () => {
        vi.mocked(useNotifications).mockReturnValue({
            data: [
                {
                    id: 'n1',
                    type: 'item',
                    refId: 'a1',
                    href: '/h',
                    createdAt: 'x',
                },
            ],
        } as never);

        await render(
            <DashboardGroups campaignId="c1" isDM={false} pendingDrafts={0} />
        );

        expect(screen.getAllByText('нове')).toHaveLength(1);
        expect(useNotifications).toHaveBeenCalledWith('c1', { enabled: true });
    });

    it('DM in a campaign sees the acquaintances tile in the game group, a template does not', async () => {
        const { unmount } = await render(
            <DashboardGroups campaignId="c1" isDM pendingDrafts={0} />
        );

        expect(
            screen.getByText('Знайомства').closest('a')?.getAttribute('href')
        ).toBe('/campaigns/c1/acquaintances');

        unmount();
        await render(
            <DashboardGroups
                campaignId="c1"
                isDM
                pendingDrafts={0}
                context={{ isTemplate: true, classesEnabled: false }}
            />
        );

        expect(screen.queryByText('Знайомства')).toBeNull();
    });

    it('player does not see the acquaintances tile when the page hides it', async () => {
        await render(
            <DashboardGroups
                campaignId="c1"
                isDM={false}
                pendingDrafts={0}
                hiddenKeys={['acquaintances']}
            />
        );

        expect(screen.queryByText('Знайомства')).toBeNull();
    });

    it('player with an unread acquaintance sees a pill on its tile', async () => {
        vi.mocked(useNotifications).mockReturnValue({
            data: [
                {
                    id: 'n1',
                    type: 'acquaintance',
                    refId: 'a1',
                    href: '/h',
                    createdAt: 'x',
                },
            ],
        } as never);

        await render(
            <DashboardGroups campaignId="c1" isDM={false} pendingDrafts={0} />
        );

        expect(screen.getAllByText('нове')).toHaveLength(1);
    });

    it('DM gets no pill and the query is disabled', async () => {
        vi.mocked(useNotifications).mockReturnValue({
            data: [
                {
                    id: 'n1',
                    type: 'item',
                    refId: 'a1',
                    href: '/h',
                    createdAt: 'x',
                },
            ],
        } as never);

        await render(
            <DashboardGroups campaignId="c1" isDM pendingDrafts={0} />
        );

        expect(screen.queryByText('нове')).toBeNull();
        expect(useNotifications).toHaveBeenCalledWith('c1', { enabled: false });
    });
});
