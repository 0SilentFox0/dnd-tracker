// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TalentChoicesEditor } from '../TalentChoicesEditor';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');
vi.mock('@/components/ui/select-field', async () => ({
    SelectField: (await import('@/components/ui/__tests__/select-field-mock'))
        .SelectField,
}));

const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
];

describe('TalentChoicesEditor', () => {
    afterEach(cleanup);

    it('adds an empty group and a talent to a group', () => {
        const onChange = vi.fn();

        const { rerender } = render(
            <TalentChoicesEditor
                groups={[]}
                options={options}
                onChange={onChange}
            />
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Додати групу вибору' })
        );
        expect(onChange).toHaveBeenCalledWith([[]]);

        rerender(
            <TalentChoicesEditor
                groups={[['a']]}
                options={options}
                onChange={onChange}
            />
        );
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: 'b' },
        });
        expect(onChange).toHaveBeenLastCalledWith([['a', 'b']]);
    });

    it('removes a talent and a group', () => {
        const onChange = vi.fn();

        render(
            <TalentChoicesEditor
                groups={[['a', 'b']]}
                options={options}
                onChange={onChange}
            />
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Alpha/ })
        );
        expect(onChange).toHaveBeenLastCalledWith([['b']]);

        fireEvent.click(screen.getByRole('button', { name: 'Прибрати групу' }));
        expect(onChange).toHaveBeenLastCalledWith([]);
    });
});
