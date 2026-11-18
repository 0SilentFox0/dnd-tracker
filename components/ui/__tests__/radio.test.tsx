// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Radio } from '@/components/ui/radio';

function Group() {
    const [value, setValue] = useState('a');

    return (
        <>
            {['a', 'b'].map((v) => (
                <label key={v}>
                    {v}
                    <Radio
                        name="g"
                        value={v}
                        checked={value === v}
                        onChange={() => setValue(v)}
                    />
                </label>
            ))}
        </>
    );
}

describe('Radio', () => {
    afterEach(cleanup);

    it('renders a radio input and lets only one option be selected', () => {
        render(<Group />);

        const [a, b] = screen.getAllByRole('radio') as HTMLInputElement[];

        expect(a.checked).toBe(true);
        fireEvent.click(b);
        expect(b.checked).toBe(true);
        expect(a.checked).toBe(false);
    });

    it('does not react when disabled and keeps a custom class', () => {
        render(<Radio disabled className="extra" aria-label="r" />);

        const radio = screen.getByLabelText('r') as HTMLInputElement;

        fireEvent.click(radio);
        expect(radio.checked).toBe(false);
        expect(radio.className).toContain('extra');
    });
});
