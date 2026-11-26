// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleRow } from '@/components/battle/list/BattleRow';
import type { BattleListCardData } from '@/types/battle';

const onDelete = vi.fn();

const onReset = vi.fn();

vi.mock('@/lib/hooks/battles', () => ({
    useDeleteBattleCard: () => ({ isDeleting: false, onDelete }),
    useResetBattleCard: () => ({ isResetting: false, onReset }),
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
    name: 'Siege',
    description: null,
    status: 'completed',
    currentRound: 4,
    createdAt: '2026-11-20T10:00:00.000Z',
    startedAt: '2026-11-20T10:05:00.000Z',
    completedAt: '2026-11-20T11:00:00.000Z',
    map: null,
    sides: { ally: { count: 1, faces: [] }, enemy: { count: 1, faces: [] } },
    result: 'victory',
};

describe('BattleRow', () => {
    it('shows the winner pill', () => {
        render(<BattleRow battle={battle} campaignId="c1" />);

        expect(
            screen.getByText('battleSetup.list.card.result.victory')
        ).toBeTruthy();
    });

    it('omits the pill when the result is unknown', () => {
        render(
            <BattleRow
                battle={{ ...battle, result: null }}
                campaignId="c1"
            />
        );

        expect(screen.queryByText(/card\.result\./)).toBeNull();
    });

    it('replay and delete live in the menu', () => {
        render(<BattleRow battle={battle} campaignId="c1" />);

        fireEvent.click(
            screen.getByRole('button', { name: 'battleSetup.list.card.replay' })
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'battleSetup.list.card.delete' })
        );

        expect(onReset).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('demo mode has only the open link', () => {
        render(<BattleRow battle={battle} campaignId="c1" canEdit={false} />);

        expect(
            screen
                .getByRole('link', { name: 'battleSetup.list.card.open' })
                .getAttribute('data-tour')
        ).toBe('battle.open');
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
});
