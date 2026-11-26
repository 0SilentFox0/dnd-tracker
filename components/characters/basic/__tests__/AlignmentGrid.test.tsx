// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlignmentGrid } from '@/components/characters/basic/AlignmentGrid';

vi.mock('@/lib/hooks/characters', () => ({
    useAlignmentLabel: () => (value: string, form?: string) =>
        form === 'short' ? value.slice(0, 2) : value,
}));

afterEach(cleanup);

const setup = (value: string | null, onChange = vi.fn()) => {
    render(
        <AlignmentGrid
            id="alignment"
            value={value}
            onChange={onChange}
            allowNone
            noneLabel="None"
        />
    );

    return onChange;
};

describe('AlignmentGrid', () => {
    it('renders nine cells plus the none option', () => {
        setup('Lawful Good');
        expect(screen.getAllByRole('radio')).toHaveLength(10);
    });

    it('click selects a cell with the canonical value', () => {
        const onChange = setup(null);

        fireEvent.click(screen.getByRole('radio', { name: 'Chaotic Good' }));
        expect(onChange).toHaveBeenCalledWith('Chaotic Good');
    });

    it('none option sets null and is checked for an empty value', () => {
        const onChange = setup(null);

        expect(screen.getByRole('radio', { name: 'None' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
        fireEvent.click(screen.getByRole('radio', { name: 'None' }));
        expect(onChange).toHaveBeenCalledWith(null);
    });

    it('ArrowDown from Lawful Good moves to Lawful Neutral', () => {
        const onChange = setup('Lawful Good');

        fireEvent.keyDown(screen.getByRole('radio', { name: 'Lawful Good' }), {
            key: 'ArrowDown',
        });
        expect(onChange).toHaveBeenCalledWith('Lawful Neutral');
    });

    it('aria-checked marks only the selected cell', () => {
        setup('True Neutral');

        const checked = screen
            .getAllByRole('radio')
            .filter((el) => el.getAttribute('aria-checked') === 'true');

        expect(checked).toHaveLength(1);
        expect(checked[0]).toHaveAccessibleName('True Neutral');
    });

    it('a free value keeps no cell checked and shows the raw text', () => {
        setup('any alignment');
        expect(screen.getByText('any alignment')).toBeTruthy();
        expect(
            screen
                .getAllByRole('radio')
                .some((el) => el.getAttribute('aria-checked') === 'true')
        ).toBe(false);
    });
});
