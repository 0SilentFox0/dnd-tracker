// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from '@/components/ui/input';
import { LabeledInput } from '@/components/ui/labeled-input';
import { NumberInput } from '@/components/ui/number-input';

describe('field DS', () => {
    it('NumberInput defaults to numeric inputmode', () => {
        render(<NumberInput aria-label="n" value={1} onChange={() => {}} />);

        expect(screen.getByLabelText('n').getAttribute('inputmode')).toBe(
            'numeric'
        );
    });

    it('LabeledInput renders error as alert and marks field invalid', () => {
        render(<LabeledInput label="Name" error="Required" />);

        expect(screen.getByRole('alert').textContent).toBe('Required');
        expect(
            screen.getByLabelText('Name').getAttribute('aria-invalid')
        ).toBe('true');
    });

    it('Input keeps its data-slot', () => {
        render(<Input aria-label="x" />);

        expect(screen.getByLabelText('x').getAttribute('data-slot')).toBe(
            'input'
        );
    });
});
