// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { D100RollPicker } from '../D100RollPicker';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');
vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

const fortune = (
    over: Partial<Parameters<typeof D100RollPicker>[0]['fortune']> = {}
) => ({
    available: false,
    left: 0,
    value: null,
    onChange: vi.fn(),
    ...over,
});

const enter = (value: string) => {
    fireEvent.change(screen.getByLabelText('1–100'), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Кинути' }));
};

describe('D100RollPicker', () => {
    afterEach(cleanup);

    it('defaults to the auto source and calls onAuto', () => {
        const onAuto = vi.fn();

        render(
            <D100RollPicker
                fortune={fortune()}
                onRoll={vi.fn()}
                onAuto={onAuto}
            />
        );
        expect(screen.getByRole('button', { name: 'Авто' })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        fireEvent.click(screen.getByRole('button', { name: 'Авто-кидок' }));
        expect(onAuto).toHaveBeenCalledTimes(1);
    });

    it('switches to manual entry and reports the value', () => {
        const onRoll = vi.fn();

        render(
            <D100RollPicker
                fortune={fortune()}
                onRoll={onRoll}
                onAuto={vi.fn()}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Ручний' }));
        expect(screen.queryByRole('button', { name: 'Авто-кидок' })).toBeNull();
        enter('37');
        expect(onRoll).toHaveBeenCalledWith(37);
    });

    it('a locked source hides the source switch', () => {
        render(
            <D100RollPicker
                locked="manual"
                fortune={fortune()}
                onRoll={vi.fn()}
                onAuto={vi.fn()}
            />
        );
        expect(screen.queryByRole('button', { name: 'Авто' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Кинути' })).toBeTruthy();
    });

    it('shows Fortune only when available and forwards the chosen kind', () => {
        const onChange = vi.fn();

        render(
            <D100RollPicker
                fortune={fortune({ available: true, left: 2, onChange })}
                onRoll={vi.fn()}
                onAuto={vi.fn()}
            />
        );
        expect(screen.getByText('Залишилось Удачі: 2')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '+1 РУ' }));
        expect(onChange).toHaveBeenCalledWith('sl');
        fireEvent.click(screen.getByRole('button', { name: 'Вимк.' }));
        expect(onChange).toHaveBeenLastCalledWith(null);
    });

    it('a manual reroll asks for two rolls and reports both', () => {
        const onRoll = vi.fn();

        render(
            <D100RollPicker
                fortune={fortune({ available: true, left: 1, value: 'reroll' })}
                onRoll={onRoll}
                onAuto={vi.fn()}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Ручний' }));
        expect(screen.getByText('Перший кидок')).toBeInTheDocument();
        enter('15');
        expect(onRoll).not.toHaveBeenCalled();
        expect(
            screen.getByText('Другий кидок (перекидання)')
        ).toBeInTheDocument();
        enter('88');
        expect(onRoll).toHaveBeenCalledWith(15, 88);
    });

    it('changing the Fortune choice restarts the reroll sequence', () => {
        const onChange = vi.fn();

        const { rerender } = render(
            <D100RollPicker
                fortune={fortune({
                    available: true,
                    left: 1,
                    value: 'reroll',
                    onChange,
                })}
                onRoll={vi.fn()}
                onAuto={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Ручний' }));
        enter('15');
        expect(
            screen.getByText('Другий кидок (перекидання)')
        ).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '+1 РУ' }));
        rerender(
            <D100RollPicker
                fortune={fortune({
                    available: true,
                    left: 1,
                    value: 'reroll',
                    onChange,
                })}
                onRoll={vi.fn()}
                onAuto={vi.fn()}
            />
        );
        expect(screen.getByText('Перший кидок')).toBeInTheDocument();
    });
});
