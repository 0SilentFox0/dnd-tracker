// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { KpiTile } from '../KpiTile';

afterEach(cleanup);

describe('KpiTile', () => {
    it('shows a positive delta in green', () => {
        render(<KpiTile label="New" value={5} delta={0.12} />);

        const el = screen.getByTestId('kpi-delta');

        expect(el.textContent).toBe('+12%');
        expect(el.className).toContain('text-green-600');
    });

    it('inverts the colour for a bad-when-up metric', () => {
        render(<KpiTile label="Deleted" value={5} delta={0.5} invert />);

        expect(screen.getByTestId('kpi-delta').className).toContain(
            'text-red-600'
        );
    });

    it('renders no delta for null', () => {
        render(<KpiTile label="New" value={5} delta={null} />);

        expect(screen.queryByTestId('kpi-delta')).toBeNull();
    });
});
