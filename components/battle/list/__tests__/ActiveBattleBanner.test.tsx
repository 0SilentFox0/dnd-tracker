// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActiveBattleBanner } from '@/components/battle/list/ActiveBattleBanner';
import type { BattleListCardData } from '@/types/battle';

const onReset = vi.fn();

const media = vi.hoisted(() => ({ wide: true }));

vi.mock('@/lib/hooks/battles', () => ({
    useDeleteBattleCard: () => ({ isDeleting: false, onDelete: vi.fn() }),
    useResetBattleCard: () => ({ isResetting: false, onReset }),
}));
vi.mock('@/lib/hooks/common', () => ({ useMediaQuery: () => media.wide }));
vi.mock('@/components/common/entity/ActionsMenu', () => ({
    ActionsMenu: ({ actions }: { actions: { label: string }[] }) => (
        <ul>
            {actions.map((a) => (
                <li key={a.label}>{a.label}</li>
            ))}
        </ul>
    ),
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    media.wide = true;
});

const battle: BattleListCardData = {
    id: 'b1',
    name: 'Dragon',
    description: null,
    status: 'active',
    currentRound: 3,
    createdAt: '2026-11-20T10:00:00.000Z',
    startedAt: '2026-11-20T10:05:00.000Z',
    completedAt: null,
    map: null,
    sides: { ally: { count: 1, faces: [] }, enemy: { count: 1, faces: [] } },
    result: null,
};

describe('ActiveBattleBanner', () => {
    it('links continue to the battle with the tour anchor', () => {
        render(<ActiveBattleBanner battle={battle} campaignId="c1" />);

        const link = screen.getByRole('link', {
            name: 'battleSetup.list.card.continue',
        });

        expect(link.getAttribute('href')).toBe('/campaigns/c1/battles/b1');
        expect(link.getAttribute('data-tour')).toBe('battle.open');
    });

    it('wide: stop is a button', () => {
        render(<ActiveBattleBanner battle={battle} campaignId="c1" />);

        fireEvent.click(
            screen.getByRole('button', { name: 'battleSetup.list.card.stop' })
        );

        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('phone: stop moves into the menu', () => {
        media.wide = false;

        render(<ActiveBattleBanner battle={battle} campaignId="c1" />);

        expect(
            screen.queryByRole('button', {
                name: 'battleSetup.list.card.stop',
            })
        ).toBeNull();
        expect(screen.getByText('battleSetup.list.card.stop')).toBeTruthy();
    });

    it('demo mode only opens', () => {
        render(
            <ActiveBattleBanner
                battle={battle}
                campaignId="c1"
                canEdit={false}
            />
        );

        expect(
            screen.getByRole('link', { name: 'battleSetup.list.card.open' })
        ).toBeTruthy();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
});
