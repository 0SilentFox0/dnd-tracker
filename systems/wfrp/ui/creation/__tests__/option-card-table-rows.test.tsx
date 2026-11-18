// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModeTabs, OptionCard } from '../OptionCard';
import { TableRowsEditor } from '../TableRowsEditor';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');
vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));
vi.mock('@/components/ui/select-field', async () => ({
    SelectField: (await import('@/components/ui/__tests__/select-field-mock'))
        .SelectField,
}));

describe('OptionCard / ModeTabs', () => {
    afterEach(cleanup);

    it('reflects selection and fires onSelect unless disabled', () => {
        const onSelect = vi.fn();

        const { rerender } = render(
            <OptionCard selected onSelect={onSelect}>
                A
            </OptionCard>
        );

        const card = screen.getByRole('radio', { name: 'A' });

        expect(card).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(card);
        expect(onSelect).toHaveBeenCalledTimes(1);

        rerender(
            <OptionCard selected={false} onSelect={onSelect} disabled>
                A
            </OptionCard>
        );
        expect(screen.getByRole('radio')).toHaveAttribute(
            'aria-checked',
            'false'
        );
        expect(screen.getByRole('radio')).toBeDisabled();
    });

    it('marks the active option and reports the clicked value', () => {
        const onChange = vi.fn();

        render(
            <ModeTabs
                label="Режим"
                value="b"
                options={[
                    { value: 'a', label: 'Alpha' },
                    { value: 'b', label: 'Beta' },
                ]}
                onChange={onChange}
            />
        );
        expect(screen.getByRole('radiogroup', { name: 'Режим' })).toBeTruthy();
        expect(screen.getByRole('radio', { name: 'Beta' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
        fireEvent.click(screen.getByRole('radio', { name: 'Alpha' }));
        expect(onChange).toHaveBeenCalledWith('a');
    });
});

describe('TableRowsEditor', () => {
    afterEach(cleanup);

    const options = [
        { value: 'c1', label: 'Career 1' },
        { value: 'c2', label: 'Career 2' },
    ];

    const setup = (rows: { max: number; id: string }[], error?: string) => {
        const onChange = vi.fn();

        render(
            <TableRowsEditor
                title="Таблиця"
                idLabel="Кар'єра"
                rows={rows}
                options={options}
                onChange={onChange}
                error={error}
            />
        );

        return onChange;
    };

    it('appends a row 10 above the last bound, capped at 100', () => {
        const onChange = setup([{ max: 40, id: 'c1' }]);

        fireEvent.click(screen.getByRole('button', { name: 'Додати рядок' }));
        expect(onChange).toHaveBeenCalledWith([
            { max: 40, id: 'c1' },
            { max: 50, id: '' },
        ]);
        cleanup();

        const capped = setup([{ max: 95, id: 'c1' }]);

        fireEvent.click(screen.getByRole('button', { name: 'Додати рядок' }));
        expect(capped).toHaveBeenCalledWith([
            { max: 95, id: 'c1' },
            { max: 100, id: '' },
        ]);
        cleanup();

        const empty = setup([]);

        fireEvent.click(screen.getByRole('button', { name: 'Додати рядок' }));
        expect(empty).toHaveBeenCalledWith([{ max: 10, id: '' }]);
    });

    it('changes the target id and removes a row by index', () => {
        const rows = [
            { max: 30, id: 'c1' },
            { max: 100, id: 'c2' },
        ];

        const onChange = setup(rows);

        fireEvent.change(screen.getByRole('combobox', { name: "Кар'єра 2" }), {
            target: { value: 'c1' },
        });
        expect(onChange).toHaveBeenLastCalledWith([
            rows[0],
            { max: 100, id: 'c1' },
        ]);

        fireEvent.click(
            screen.getByRole('button', { name: 'Прибрати рядок 1' })
        );
        expect(onChange).toHaveBeenLastCalledWith([rows[1]]);
    });

    it('commits an edited upper bound on blur', () => {
        const rows = [{ max: 30, id: 'c1' }];

        const onChange = setup(rows);

        const input = screen.getByLabelText('До 1');

        fireEvent.change(input, { target: { value: '45' } });
        fireEvent.blur(input);
        expect(onChange).toHaveBeenLastCalledWith([{ max: 45, id: 'c1' }]);
    });

    it('shows an error alert only when given', () => {
        setup([], 'Межі мають зростати');
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Межі мають зростати'
        );
        cleanup();
        setup([]);
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
