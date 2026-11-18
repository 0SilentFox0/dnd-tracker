// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type AilmentDraft, AilmentsEditor } from '../AilmentsEditor';

import { render } from '@/lib/i18n/test/render-uk';
import { AILMENTS_MAX } from '@/systems/wfrp/rules/downtime/types';

vi.unmock('next-intl');
vi.mock('@/components/ui/select-field', async () => ({
    SelectField: (await import('@/components/ui/__tests__/select-field-mock'))
        .SelectField,
}));

const ailment = (over: Partial<AilmentDraft> = {}): AilmentDraft => ({
    id: 'a1',
    kind: 'disease',
    daysLeft: 5,
    label: 'Fever',
    ...over,
});

describe('AilmentsEditor', () => {
    afterEach(cleanup);

    it('shows the empty message and an add button that appends a default ailment', () => {
        const onChange = vi.fn();

        render(<AilmentsEditor value={[]} editable onChange={onChange} />);
        expect(screen.getByText('Недуг немає')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Додати недугу' }));
        expect(onChange).toHaveBeenCalledWith([
            { kind: 'disease', daysLeft: 7, label: '' },
        ]);
    });

    it('is read-only when not editable', () => {
        render(
            <AilmentsEditor
                value={[ailment()]}
                editable={false}
                onChange={vi.fn()}
            />
        );
        expect(screen.getByText(/Хвороба: Fever · Днів 5/)).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('patches only the edited ailment', () => {
        const onChange = vi.fn();

        const value = [ailment(), ailment({ id: 'a2', label: 'Rot' })];

        render(<AilmentsEditor value={value} editable onChange={onChange} />);
        fireEvent.change(screen.getAllByRole('textbox', { name: 'Назва' })[1], {
            target: { value: 'Rotten' },
        });
        expect(onChange).toHaveBeenLastCalledWith([
            value[0],
            { ...value[1], label: 'Rotten' },
        ]);

        fireEvent.change(screen.getAllByLabelText('Днів')[0], {
            target: { value: '9' },
        });
        expect(onChange).toHaveBeenLastCalledWith([
            { ...value[0], daysLeft: 9 },
            value[1],
        ]);
    });

    it('changes the kind and removes by index', () => {
        const onChange = vi.fn();

        const value = [ailment(), ailment({ id: 'a2' })];

        render(<AilmentsEditor value={value} editable onChange={onChange} />);
        fireEvent.change(screen.getAllByRole('combobox')[0], {
            target: { value: 'injury' },
        });
        expect(onChange).toHaveBeenLastCalledWith([
            { ...value[0], kind: 'injury' },
            value[1],
        ]);

        fireEvent.click(screen.getAllByRole('button', { name: 'Прибрати' })[0]);
        expect(onChange).toHaveBeenLastCalledWith([value[1]]);
    });

    it('disables add at the maximum count', () => {
        const value = Array.from({ length: AILMENTS_MAX }, (_, i) =>
            ailment({ id: `a${i}` })
        );

        render(<AilmentsEditor value={value} editable onChange={vi.fn()} />);
        expect(
            screen.getByRole('button', { name: 'Додати недугу' })
        ).toBeDisabled();
    });
});
