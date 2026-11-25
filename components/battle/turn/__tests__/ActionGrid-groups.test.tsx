// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionGrid } from '@/components/battle/turn/ActionGrid';
import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

const turn = (status: object) =>
    ({
        phase: 'acting',
        status: {
            actionUsed: false,
            bonusAvailable: true,
            skipped: false,
            ...status,
        },
        strikeAndReturn: { available: false, run: vi.fn() },
        actions: { endTurn: vi.fn() },
    }) as never;

const props = () => ({
    pending: false,
    available: { magic: true, bonus: true },
    actions: { attack: vi.fn(), magic: vi.fn(), bonus: vi.fn() },
});

describe('ActionGrid groups', () => {
    afterEach(cleanup);

    it('shows tiles without group headers or sub-captions', () => {
        render(<ActionGrid turn={turn({})} {...props()} />);

        expect(screen.queryByText('Бонусна дія')).toBeNull();
        expect(screen.queryByText('доступна')).toBeNull();
        expect(screen.queryByText('Удар зброєю')).toBeNull();
        expect(screen.getByRole('button', { name: /^Бонус$/ })).toBeTruthy();
    });

    it('disables the bonus tile once the bonus action is spent', () => {
        render(
            <ActionGrid turn={turn({ bonusAvailable: false })} {...props()} />
        );

        expect(
            screen
                .getByRole('button', { name: /^Бонус$/ })
                .hasAttribute('disabled')
        ).toBe(true);
    });

    it('numbers tiles in order and keeps tiles 1:1', () => {
        render(<ActionGrid turn={turn({})} {...props()} />);

        expect(screen.getAllByRole('button')).toHaveLength(4);
        expect(screen.getByRole('button', { name: /^Атака$/ })).toBeTruthy();
        expect(document.querySelectorAll('kbd')).toHaveLength(3);
        expect(document.querySelector('kbd')?.textContent).toBe('1');
    });

    it('digit hotkey runs the tile when enabled', () => {
        const p = props();

        render(
            <ActionGrid
                turn={turn({})}
                hotkeys={{ enabled: true, close: vi.fn() }}
                {...p}
            />
        );

        fireEvent.keyDown(document.body, { key: '2' });

        expect(p.actions.magic).toHaveBeenCalledTimes(1);
    });
});
