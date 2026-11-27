// @vitest-environment happy-dom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BattleList } from '@/components/battle/list/BattleList';
import { SEARCH_DEBOUNCE_MS } from '@/lib/hooks/common';
import type { BattleListCardData } from '@/types/battle';

vi.mock('@/lib/hooks/battles', async () => ({
    ...(await import('@/lib/hooks/battles/useBattleListSections')),
    useDeleteBattleCard: () => ({ isDeleting: false, onDelete: vi.fn() }),
    useResetBattleCard: () => ({ isResetting: false, onReset: vi.fn() }),
}));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useMediaQuery: () => true,
}));

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

const card = (
    id: string,
    name: string,
    status: BattleListCardData['status']
): BattleListCardData => ({
    id,
    name,
    description: null,
    status,
    currentRound: 2,
    createdAt: '2026-11-20T10:00:00.000Z',
    startedAt: null,
    completedAt: null,
    map: null,
    sides: { ally: { count: 1, faces: [] }, enemy: { count: 1, faces: [] } },
    result: null,
});

const battles = [
    card('a', 'Dragon', 'active'),
    card('p1', 'Goblins', 'prepared'),
    card('p2', 'Ghouls', 'prepared'),
    card('c1', 'Siege', 'completed'),
];

describe('BattleList', () => {
    it('shows a banner for the active battle only', () => {
        render(<BattleList battles={battles} campaignId="c1" />);

        expect(
            screen.getAllByRole('link', {
                name: 'battleSetup.list.card.continue',
            })
        ).toHaveLength(1);
    });

    it('chips count and filter the prepared battles', () => {
        render(<BattleList battles={battles} campaignId="c1" />);

        expect(
            screen.getByRole('button', {
                name: 'battleSetup.list.filter.prepared 2',
            })
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.list.filter.completed 1',
            })
        );

        expect(screen.queryByText('Goblins')).toBeNull();
        expect(screen.getByText('Siege')).toBeTruthy();
    });

    it('keeps the completed group collapsed by default', () => {
        render(<BattleList battles={battles} campaignId="c1" />);

        expect(screen.getByText('Goblins')).toBeTruthy();
        expect(
            screen
                .getByRole('button', {
                    name: /battleSetup.list.sections.completed/,
                })
                .getAttribute('aria-expanded')
        ).toBe('false');
    });

    it('empty list shows the empty state with create', () => {
        render(<BattleList battles={[]} campaignId="c1" />);

        expect(
            screen
                .getByRole('link', { name: 'battleSetup.list.empty.create' })
                .getAttribute('href')
        ).toBe('/campaigns/c1/dm/battles/new');
    });

    it('a filter without matches shows a quiet panel', () => {
        render(
            <BattleList
                battles={[card('p', 'Goblins', 'prepared')]}
                campaignId="c1"
            />
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.list.filter.completed 0',
            })
        );

        expect(screen.getByText('battleSetup.list.filterEmpty')).toBeTruthy();
    });

    it('a search without matches offers to clear it', () => {
        render(<BattleList battles={battles} campaignId="c1" />);

        fireEvent.change(screen.getByRole('searchbox'), {
            target: { value: 'zzz' },
        });
        act(() => void vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 1));

        expect(screen.getByText('Dragon')).toBeTruthy();
        expect(screen.queryByText('Goblins')).toBeNull();

        const clears = screen.getAllByRole('button', {
            name: 'common.search.clear',
        });

        fireEvent.click(clears[clears.length - 1]);

        expect(
            (screen.getByRole('searchbox') as HTMLInputElement).value
        ).toBe('');
    });

    it('marks the first card with the tour anchor', () => {
        const { container } = render(
            <BattleList battles={battles} campaignId="c1" />
        );

        expect(
            container.querySelectorAll('[data-tour="battle.card"]')
        ).toHaveLength(1);
        expect(
            container.querySelector('[data-tour="battle.list"]')
        ).toBeTruthy();
    });
});
