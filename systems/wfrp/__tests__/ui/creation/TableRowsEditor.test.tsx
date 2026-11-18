// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/lib/i18n/test/render-uk';
import { ModeTabs, OptionCard } from '@/systems/wfrp/ui/creation/OptionCard';
import { TableRowsEditor } from '@/systems/wfrp/ui/creation/TableRowsEditor';

vi.unmock('next-intl');

vi.mock('@/components/ui/select-field', () => ({
    SelectField: (p: {
        'aria-label'?: string;
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
    }) => (
        <select
            aria-label={p['aria-label']}
            value={p.value}
            onChange={(e) => p.onValueChange(e.target.value)}
        >
            <option value="" />
            {p.options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

afterEach(cleanup);

const props = (over: object = {}) => ({
    title: 'Таблиця',
    idLabel: 'Кар',
    rows: [
        { max: 30, id: 'a' },
        { max: 60, id: 'b' },
    ],
    options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
    ],
    onChange: vi.fn(),
    ...over,
});

describe('TableRowsEditor', () => {
    it('adds a row 10 above the last bound, capped at 100', () => {
        const p = props();

        const { rerender } = render(<TableRowsEditor {...p} />);

        fireEvent.click(screen.getByRole('button', { name: 'Додати рядок' }));

        expect(p.onChange).toHaveBeenLastCalledWith([
            ...p.rows,
            { max: 70, id: '' },
        ]);

        const capped = props({ rows: [{ max: 95, id: 'a' }] });

        rerender(<TableRowsEditor {...capped} />);
        fireEvent.click(screen.getByRole('button', { name: 'Додати рядок' }));

        expect(capped.onChange).toHaveBeenLastCalledWith([
            { max: 95, id: 'a' },
            { max: 100, id: '' },
        ]);
    });

    it('patches the id of one row and removes another', () => {
        const p = props();

        render(<TableRowsEditor {...p} />);
        fireEvent.change(screen.getByLabelText('Кар 2'), {
            target: { value: 'c' },
        });

        expect(p.onChange).toHaveBeenLastCalledWith([
            { max: 30, id: 'a' },
            { max: 60, id: 'c' },
        ]);

        fireEvent.click(
            screen.getByRole('button', { name: 'Прибрати рядок 1' })
        );

        expect(p.onChange).toHaveBeenLastCalledWith([{ max: 60, id: 'b' }]);
    });

    it('commits a clamped max on blur and shows the error', () => {
        const p = props({ error: 'Межі мають зростати' });

        render(<TableRowsEditor {...p} />);

        const input = screen.getByLabelText('До 1');

        fireEvent.change(input, { target: { value: '250' } });
        fireEvent.blur(input);

        expect(p.onChange).toHaveBeenLastCalledWith([
            { max: 100, id: 'a' },
            { max: 60, id: 'b' },
        ]);
        expect(screen.getByRole('alert').textContent).toBe(
            'Межі мають зростати'
        );
    });
});

describe('OptionCard / ModeTabs', () => {
    it('OptionCard reports selection state and ignores clicks when disabled', () => {
        const onSelect = vi.fn();

        render(
            <OptionCard selected onSelect={onSelect} disabled>
                X
            </OptionCard>
        );

        const card = screen.getByRole('radio');

        expect(card.getAttribute('aria-checked')).toBe('true');

        fireEvent.click(card);

        expect(onSelect).not.toHaveBeenCalled();
    });

    it('ModeTabs marks the active option and emits the chosen value', () => {
        const onChange = vi.fn();

        render(
            <ModeTabs
                label="Режим"
                value="b"
                options={[
                    { value: 'a', label: 'A' },
                    { value: 'b', label: 'B' },
                ]}
                onChange={onChange}
            />
        );

        expect(
            screen
                .getByRole('radio', { name: 'B' })
                .getAttribute('aria-checked')
        ).toBe('true');

        fireEvent.click(screen.getByRole('radio', { name: 'A' }));

        expect(onChange).toHaveBeenCalledWith('a');
    });
});
