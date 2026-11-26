// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HudSegmented } from '@/components/hud';

const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
] as const;

function Harness({ disabled }: { disabled?: boolean }) {
    const [v, setV] = useState<'a' | 'b' | 'c' | null>('a');

    return (
        <HudSegmented
            id="seg"
            label="Pick"
            value={v}
            options={[...options]}
            onValueChange={setV}
            disabled={disabled}
        />
    );
}

afterEach(cleanup);

describe('HudSegmented', () => {
    it('is a labelled radiogroup with the active radio checked', () => {
        render(<Harness />);

        expect(screen.getByRole('radiogroup', { name: 'Pick' })).toBeTruthy();
        expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
        expect(screen.getByRole('radio', { name: 'Beta' })).toHaveAttribute(
            'aria-checked',
            'false'
        );
    });

    it('selects on click', () => {
        const onValueChange = vi.fn();

        render(
            <HudSegmented
                id="seg"
                label="Pick"
                value={null}
                options={[...options]}
                onValueChange={onValueChange}
            />
        );
        fireEvent.click(screen.getByRole('radio', { name: 'Beta' }));
        expect(onValueChange).toHaveBeenCalledWith('b');
    });

    it('moves focus and selection with the arrows', () => {
        render(<Harness />);
        fireEvent.keyDown(screen.getByRole('radio', { name: 'Alpha' }), {
            key: 'ArrowRight',
        });
        expect(screen.getByRole('radio', { name: 'Beta' })).toHaveFocus();
        expect(screen.getByRole('radio', { name: 'Beta' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
    });

    it('blocks interaction when disabled', () => {
        render(<Harness disabled />);
        fireEvent.click(screen.getByRole('radio', { name: 'Beta' }));
        expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
    });
});
