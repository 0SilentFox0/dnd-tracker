// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleCard } from '@/components/battle/list/BattleCard';
import type { BattleListCardData } from '@/types/battle';

const onDelete = vi.fn();

vi.mock('@/lib/hooks/battles', () => ({
    useDeleteBattleCard: () => ({ isDeleting: false, onDelete }),
}));
vi.mock('@/components/common/entity/ActionsMenu', () => ({
    ActionsMenu: ({
        actions,
    }: {
        actions: { label: string; onSelect?: () => void }[];
    }) => (
        <div>
            {actions.map((a) => (
                <button key={a.label} type="button" onClick={a.onSelect}>
                    {a.label}
                </button>
            ))}
        </div>
    ),
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const battle: BattleListCardData = {
    id: 'b1',
    name: 'Ambush',
    description: 'On the road',
    status: 'prepared',
    currentRound: 1,
    createdAt: '2026-11-20T10:00:00.000Z',
    startedAt: null,
    completedAt: null,
    map: null,
    sides: {
        ally: { count: 2, faces: [] },
        enemy: { count: 3, faces: [] },
    },
    result: null,
};

describe('BattleCard', () => {
    it('keeps delete inside the menu and calls the delete flow', () => {
        render(<BattleCard battle={battle} campaignId="c1" />);

        fireEvent.click(
            screen.getByRole('button', { name: 'battleSetup.list.card.delete' })
        );

        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('links start to the play page with the tour anchor', () => {
        render(<BattleCard battle={battle} campaignId="c1" />);

        const start = screen.getByRole('link', {
            name: 'battleSetup.list.card.start',
        });

        expect(start.getAttribute('href')).toBe('/campaigns/c1/battles/b1');
        expect(start.getAttribute('data-tour')).toBe('battle.open');
    });

    it('demo mode offers only open', () => {
        render(<BattleCard battle={battle} campaignId="c1" canEdit={false} />);

        expect(
            screen.getByRole('link', { name: 'battleSetup.list.card.open' })
        ).toBeTruthy();
        expect(
            screen.queryByRole('link', { name: 'battleSetup.list.card.edit' })
        ).toBeNull();
        expect(
            screen.queryByRole('button', {
                name: 'battleSetup.list.card.delete',
            })
        ).toBeNull();
    });

    it('renders the placeholder for a battle without a map', () => {
        const { container } = render(
            <BattleCard battle={battle} campaignId="c1" />
        );

        expect(container.querySelector('[data-empty="map"]')).toBeTruthy();
        expect(screen.getByText('battleSetup.list.card.noMap')).toBeTruthy();
    });

    it('shows the sides summary label', () => {
        render(<BattleCard battle={battle} campaignId="c1" />);

        expect(
            screen.getByRole('img', {
                name: 'battleSetup.list.card.sides {"ally":2,"enemy":3}',
            })
        ).toBeTruthy();
    });
});
