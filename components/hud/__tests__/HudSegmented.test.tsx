// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HudSegmented } from '@/components/hud/HudSegmented';

afterEach(cleanup);

const OPTIONS = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
];

function setup(props: { value?: string | null; disabled?: boolean } = {}) {
    const onValueChange = vi.fn();

    render(
        <HudSegmented
            id="seg"
            label="Pick"
            value={props.value === undefined ? 'a' : props.value}
            options={OPTIONS}
            onValueChange={onValueChange}
            disabled={props.disabled}
        />
    );

    return onValueChange;
}

describe('HudSegmented', () => {
    it('selects an option on click', () => {
        const onValueChange = setup();

        fireEvent.click(screen.getByRole('radio', { name: 'B' }));

        expect(onValueChange).toHaveBeenCalledWith('b');
        expect(screen.getByRole('radiogroup', { name: 'Pick' })).toBeTruthy();
    });

    it('wraps from the last option to the first on ArrowRight', () => {
        const onValueChange = setup({ value: 'c' });

        fireEvent.keyDown(screen.getByRole('radio', { name: 'C' }), {
            key: 'ArrowRight',
        });

        expect(onValueChange).toHaveBeenCalledWith('a');
    });

    it('ignores keys and clicks when disabled', () => {
        const onValueChange = setup({ disabled: true });

        fireEvent.keyDown(screen.getByRole('radio', { name: 'A' }), {
            key: 'ArrowRight',
        });
        fireEvent.click(screen.getByRole('radio', { name: 'B' }));

        expect(onValueChange).not.toHaveBeenCalled();
    });

    it('puts tabindex 0 on the first option when value is null', () => {
        setup({ value: null });

        expect(
            screen.getByRole('radio', { name: 'A' }).getAttribute('tabindex')
        ).toBe('0');
        expect(
            screen.getByRole('radio', { name: 'B' }).getAttribute('tabindex')
        ).toBe('-1');
    });
});
