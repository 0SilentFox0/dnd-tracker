// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BattleScene } from '@/types/api';
import type { BattleMapConfig } from '@/types/battle';

vi.mock('@/components/battle/map/BattleMap', () => ({
    BattleMap: ({
        actions,
    }: {
        actions?: { onCellClick?: (point: { x: number; y: number }) => void };
    }) => (
        <button
            type="button"
            onClick={() => actions?.onCellClick?.({ x: 2, y: 3 })}
        >
            map cell
        </button>
    ),
}));

import { DemoBattleSandbox } from '../DemoBattleSandbox';

import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';
import { buildMockParticipants } from '@/lib/hooks/battle/mock-participants';

const scene = {
    id: 'battle-maze',
    name: 'The Glass Labyrinth',
    description: 'Marks and turns reset on reopen.',
    map: {
        ...DEFAULT_BATTLE_MAP,
        maze: {
            walls: [],
            exit: { x: 8, y: 5 },
            difficulty: 'medium',
            teleports: [],
            fog: [],
            marks: {},
            dark: false,
        },
    } as BattleMapConfig,
    initiativeOrder: buildMockParticipants().slice(0, 2),
    participants: [],
} as unknown as BattleScene;

describe('DemoBattleSandbox', () => {
    it('shows the authored encounter and keeps maze marks temporary with a reset control', () => {
        render(<DemoBattleSandbox scene={scene} />);

        expect(
            screen.getByRole('heading', { name: 'The Glass Labyrinth' })
        ).toBeTruthy();
        expect(screen.getByText('Knight')).toBeTruthy();
        expect(screen.getByText('Archer')).toBeTruthy();
        expect(screen.queryByText('Mage')).toBeNull();
        fireEvent.click(
            screen.getByRole('button', { name: 'battle.demo.modes.maze-mark' })
        );
        fireEvent.click(screen.getByRole('button', { name: 'map cell' }));

        expect(
            screen.getByText(/battle\.demo\.logEntry\.mazeMark/)
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'battle.demo.reset' })
        );

        expect(
            screen.queryByText(/battle\.demo\.logEntry\.mazeMark/)
        ).toBeNull();
    });
});
