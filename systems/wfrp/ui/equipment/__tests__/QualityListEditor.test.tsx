// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QualityListEditor } from '../QualityListEditor';

import { render } from '@/lib/i18n/test/render-uk';
import { QUALITY_KEYS, QUALITY_REGISTRY } from '@/systems/wfrp/rules/equipment';

vi.unmock('next-intl');
vi.mock('@/components/ui/select-field', async () => ({
    SelectField: (await import('@/components/ui/__tests__/select-field-mock'))
        .SelectField,
}));

const keyWith = (kind: 'quality' | 'flaw', hasValue: boolean) =>
    QUALITY_KEYS.find(
        (k) =>
            QUALITY_REGISTRY[k].kind === kind &&
            QUALITY_REGISTRY[k].hasValue === hasValue
    )!;

describe('QualityListEditor', () => {
    afterEach(cleanup);

    it('offers only keys of its kind that are not already added', () => {
        const taken = keyWith('quality', false);

        render(
            <QualityListEditor
                id="q"
                label="Властивості"
                kind="quality"
                value={[{ key: taken }]}
                onChange={vi.fn()}
            />
        );

        const select = screen.getByRole('combobox');

        const values = within(select)
            .getAllByRole('option')
            .map((o) => o.getAttribute('value'))
            .filter(Boolean);

        expect(values).not.toContain(taken);
        expect(
            values.every(
                (v) =>
                    QUALITY_REGISTRY[v as keyof typeof QUALITY_REGISTRY]
                        .kind === 'quality'
            )
        ).toBe(true);
        expect(values.length).toBeGreaterThan(0);
    });

    it('keeps add disabled until a pick, then appends a valued entry with value 1', () => {
        const onChange = vi.fn();

        const valued = keyWith('quality', true);

        render(
            <QualityListEditor
                id="q"
                label="Властивості"
                kind="quality"
                value={[]}
                onChange={onChange}
            />
        );

        const add = screen.getByRole('button', { name: 'Додати' });

        expect(add).toBeDisabled();
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: valued },
        });
        fireEvent.click(add);
        expect(onChange).toHaveBeenCalledWith([{ key: valued, value: 1 }]);
    });

    it('appends a valueless entry for a flag-like key', () => {
        const onChange = vi.fn();

        const plain = keyWith('flaw', false);

        render(
            <QualityListEditor
                id="f"
                label="Вади"
                kind="flaw"
                value={[]}
                onChange={onChange}
            />
        );
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: plain },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Додати' }));
        expect(onChange).toHaveBeenCalledWith([{ key: plain }]);
    });

    it('edits the value, and removes an entry', () => {
        const onChange = vi.fn();

        const valued = keyWith('quality', true);

        const plain = keyWith('quality', false);

        render(
            <QualityListEditor
                id="q"
                label="Властивості"
                kind="quality"
                value={[{ key: plain }, { key: valued, value: 2 }]}
                onChange={onChange}
            />
        );
        expect(screen.getAllByLabelText('Значення')).toHaveLength(1);
        fireEvent.change(screen.getByLabelText('Значення'), {
            target: { value: '4' },
        });
        expect(onChange).toHaveBeenLastCalledWith([
            { key: plain },
            { key: valued, value: 4 },
        ]);

        fireEvent.click(screen.getAllByRole('button', { name: /Прибрати/ })[0]);
        expect(onChange).toHaveBeenLastCalledWith([{ key: valued, value: 2 }]);
    });
});
