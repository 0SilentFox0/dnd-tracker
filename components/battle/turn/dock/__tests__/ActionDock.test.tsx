// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionDock } from '../ActionDock';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render as renderUk } from '@/lib/i18n/test/render-uk';
import { showDock } from '@/lib/utils/battle/view/dock-status';
import type { BattleParticipant } from '@/types/battle';

vi.unmock('next-intl');

const render = (ui: React.ReactElement) =>
    renderUk(ui, { wrapper: fakeScene().wrapper });

const base = {
    status: { actionUsed: false, bonusAvailable: true, reactionAvailable: true },
    economy: { bonusAction: true, reaction: true },
    phase: 'acting' as const,
    on: { actions: vi.fn(), end: vi.fn() },
};

const diamonds = (c: HTMLElement) =>
    c.querySelectorAll('[data-state="ready"],[data-state="spent"]');

describe('ActionDock', () => {
    afterEach(cleanup);

    it('diamonds follow economy flags', () => {
        const { container } = render(
            <ActionDock
                {...base}
                economy={{ bonusAction: false, reaction: false }}
            />
        );

        expect(diamonds(container)).toHaveLength(1);
    });

    it('all three diamonds when economy allows', () => {
        const { container } = render(<ActionDock {...base} />);

        expect(diamonds(container)).toHaveLength(3);
    });

    it('used action stays visible, spent and labelled', () => {
        const { container } = render(
            <ActionDock
                {...base}
                status={{ ...base.status, actionUsed: true }}
            />
        );

        expect(container.querySelector('[data-state="spent"]')).not.toBeNull();
        expect(screen.getByText('використано')).toBeTruthy();
    });

    it('shows end turn only when no resources are left', () => {
        const { rerender } = render(<ActionDock {...base} />);

        expect(screen.queryByText('Кінець ходу')).toBeNull();

        rerender(
            <ActionDock
                {...base}
                economy={{ bonusAction: false, reaction: false }}
                status={{ ...base.status, actionUsed: true }}
            />
        );

        fireEvent.click(screen.getByText('Кінець ходу'));

        expect(base.on.end).toHaveBeenCalled();
    });

    it('uses the shared glass surface and a hexagonal action button', () => {
        const { container } = render(<ActionDock {...base} />);

        expect(container.querySelector('.hud-glass')).not.toBeNull();
        expect(
            container.querySelector('[data-tour="battle.turn-controls"]')?.className
        ).toContain('clip-path');
    });

    it('countdown keeps its content and hides the action bar', () => {
        render(
            <ActionDock {...base} phase="countdown">
                <div data-testid="countdown" />
            </ActionDock>
        );

        expect(screen.getByTestId('countdown')).toBeTruthy();
        expect(screen.queryByText('Дія')).toBeNull();
    });

    it('does not show without a hero or in readOnly', () => {
        const hero = {} as BattleParticipant;

        expect(showDock(null, false)).toBe(false);
        expect(showDock(hero, true)).toBe(false);
        expect(showDock(hero, false)).toBe(true);
    });
});
