// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleListActions } from '@/components/battle/list/BattleListActions';

const mocks = vi.hoisted(() => ({
    confirm: vi.fn(),
    mutateAsync: vi.fn(),
}));

vi.mock('@/lib/hooks/battles', () => ({
    useDeleteAllBattles: () => ({
        isPending: false,
        mutateAsync: mocks.mutateAsync,
    }),
}));
vi.mock('@/lib/hooks/common', () => ({ useConfirm: () => mocks.confirm }));
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

describe('BattleListActions', () => {
    it('links create to the new battle page', () => {
        render(<BattleListActions campaignId="c1" battlesCount={2} />);

        expect(screen.getByRole('link').getAttribute('href')).toBe(
            '/campaigns/c1/dm/battles/new'
        );
    });

    it('delete-all asks for a destructive confirmation', () => {
        render(<BattleListActions campaignId="c1" battlesCount={2} />);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.list.actions.deleteAll',
            })
        );

        expect(mocks.confirm).toHaveBeenCalledWith(
            expect.objectContaining({ destructive: true })
        );
    });

    it('hides the menu without battles', () => {
        render(<BattleListActions campaignId="c1" battlesCount={0} />);

        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
});
