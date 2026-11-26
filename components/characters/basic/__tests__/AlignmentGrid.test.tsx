// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlignmentGrid } from '@/components/characters/basic/AlignmentGrid';

describe('AlignmentGrid', () => {
    afterEach(cleanup);

    it('renders nine radios plus a none option', () => {
        render(
            <AlignmentGrid id="a" value={null} onChange={vi.fn()} allowNone />
        );

        expect(screen.getAllByRole('radio')).toHaveLength(10);
        expect(
            screen
                .getAllByRole('radio')
                .filter((r) => r.getAttribute('aria-checked') === 'true')
        ).toHaveLength(1);
    });

    it('omits none by default', () => {
        render(<AlignmentGrid id="a" value={null} onChange={vi.fn()} />);

        expect(screen.getAllByRole('radio')).toHaveLength(9);
    });

    it('selects a canonical value and clears it', () => {
        const onChange = vi.fn();

        render(
            <AlignmentGrid id="a" value={null} onChange={onChange} allowNone />
        );

        fireEvent.click(screen.getAllByRole('radio')[0]);
        expect(onChange).toHaveBeenCalledWith('Lawful Good');

        fireEvent.click(screen.getAllByRole('radio')[9]);
        expect(onChange).toHaveBeenCalledWith(null);
    });

    it('marks the stored value case-insensitively', () => {
        render(
            <AlignmentGrid id="a" value="chaotic evil" onChange={vi.fn()} />
        );

        expect(
            screen.getAllByRole('radio')[8].getAttribute('aria-checked')
        ).toBe('true');
    });

    it('moves selection down a row with the arrow key', () => {
        const onChange = vi.fn();

        render(
            <AlignmentGrid id="a" value="Lawful Good" onChange={onChange} />
        );

        const radios = screen.getAllByRole('radio');

        radios[0].focus();
        fireEvent.keyDown(radios[0], { key: 'ArrowDown' });

        expect(onChange).toHaveBeenCalledWith('Lawful Neutral');
        expect(document.activeElement).toBe(radios[3]);
    });

    it('keeps a single tab stop', () => {
        render(
            <AlignmentGrid id="a" value="True Neutral" onChange={vi.fn()} />
        );

        const stops = screen
            .getAllByRole('radio')
            .filter((r) => r.tabIndex === 0);

        expect(stops).toHaveLength(1);
        expect(stops[0]).toBe(screen.getAllByRole('radio')[4]);
    });
});
