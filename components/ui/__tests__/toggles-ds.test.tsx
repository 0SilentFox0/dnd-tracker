// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Checkbox } from '@/components/ui/checkbox';
import { Radio } from '@/components/ui/radio';
import { Switch } from '@/components/ui/switch';

describe('toggles', () => {
    afterEach(cleanup);

    it('Checkbox toggles aria-checked', () => {
        render(<Checkbox aria-label="c" />);

        const box = screen.getByRole('checkbox', { name: 'c' });

        expect(box).toHaveAttribute('aria-checked', 'false');
        fireEvent.click(box);
        expect(box).toHaveAttribute('aria-checked', 'true');
    });

    it('Radio stays a native radio input', () => {
        render(<Radio aria-label="r" />);

        const radio = screen.getByRole('radio', { name: 'r' });

        expect(radio).toHaveAttribute('type', 'radio');
        expect(radio).toHaveAttribute('data-slot', 'radio');
    });

    it('Switch exposes role switch', () => {
        render(<Switch aria-label="s" />);

        const sw = screen.getByRole('switch', { name: 's' });

        expect(sw).toHaveAttribute('aria-checked', 'false');
        fireEvent.click(sw);
        expect(sw).toHaveAttribute('aria-checked', 'true');
    });
});
