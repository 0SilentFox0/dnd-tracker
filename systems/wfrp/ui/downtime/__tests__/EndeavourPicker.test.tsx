// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EndeavourPicker, isEndeavourValid } from '../EndeavourPicker';

import { render } from '@/lib/i18n/test/render-uk';
import { CHARACTERISTIC_KEYS } from '@/systems/wfrp/rules/characteristics/keys';
import type { Endeavour } from '@/systems/wfrp/rules/downtime/types';

vi.unmock('next-intl');
vi.mock('@/components/ui/select-field', async () => ({
    SelectField: (await import('@/components/ui/__tests__/select-field-mock'))
        .SelectField,
}));

const setup = (value: Endeavour | undefined) => {
    const onChange = vi.fn();

    render(
        <EndeavourPicker
            value={value}
            onChange={onChange}
            patients={[{ id: 'p1', name: 'Ульріх' }]}
            skills={[{ key: 'heal' }, { key: 'trade', spec: 'baker' }]}
        />
    );

    return onChange;
};

const pick = (label: string, value: string) =>
    fireEvent.change(screen.getByRole('combobox', { name: label }), {
        target: { value },
    });

describe('isEndeavourValid', () => {
    it.each<[string, Endeavour | undefined, boolean]>([
        ['undefined', undefined, false],
        ['earn charm', { kind: 'earn', params: { skill: 'charm' } }, true],
        [
            'earn trade with a spec',
            { kind: 'earn', params: { skill: 'trade', spec: 'baker' } },
            true,
        ],
        [
            'earn trade without a spec',
            { kind: 'earn', params: { skill: 'trade', spec: '' } },
            false,
        ],
        [
            'earn trade with a bad spec',
            { kind: 'earn', params: { skill: 'trade', spec: 'Bad Name' } },
            false,
        ],
        [
            'train with a key',
            { kind: 'train', params: { kind: 'skill', key: 'heal' } },
            true,
        ],
        [
            'train without a key',
            { kind: 'train', params: { kind: 'skill', key: '' } },
            false,
        ],
        [
            'tend with a patient',
            { kind: 'tend', params: { patientId: 'p' } },
            true,
        ],
        [
            'tend without a patient',
            { kind: 'tend', params: { patientId: '' } },
            false,
        ],
        ['rest', { kind: 'rest', params: {} }, true],
        [
            'custom with text',
            { kind: 'custom', params: { text: 'Ремонт' } },
            true,
        ],
        ['custom blank', { kind: 'custom', params: { text: '   ' } }, false],
        [
            'custom too long',
            { kind: 'custom', params: { text: 'x'.repeat(201) } },
            false,
        ],
        [
            'custom at the limit',
            { kind: 'custom', params: { text: 'x'.repeat(200) } },
            true,
        ],
    ])('%s -> %s', (_n, e, ok) => {
        expect(isEndeavourValid(e)).toBe(ok);
    });
});

describe('EndeavourPicker', () => {
    afterEach(cleanup);

    it('shows only the kind selector without a value', () => {
        setup(undefined);
        expect(screen.getAllByRole('combobox')).toHaveLength(1);
        expect(
            screen.getByRole('option', { name: 'Заняття не обрано' })
        ).toBeInTheDocument();
    });

    it.each([
        ['earn', { kind: 'earn', params: { skill: 'charm' } }],
        [
            'train',
            {
                kind: 'train',
                params: { kind: 'characteristic', key: CHARACTERISTIC_KEYS[0] },
            },
        ],
        ['tend', { kind: 'tend', params: { patientId: '' } }],
        ['rest', { kind: 'rest', params: {} }],
        ['custom', { kind: 'custom', params: { text: '' } }],
    ])('choosing %s resets to its default params', (kind, expected) => {
        const onChange = setup({ kind: 'rest', params: {} });

        pick('Заняття', kind === 'rest' ? 'earn' : kind);
        expect(onChange).toHaveBeenLastCalledWith(
            kind === 'rest'
                ? { kind: 'earn', params: { skill: 'charm' } }
                : expected
        );
    });

    it('earn: switching to trade asks for a spec; the spec is lower-cased', () => {
        const onChange = setup({ kind: 'earn', params: { skill: 'charm' } });

        pick('Навичка', 'trade');
        expect(onChange).toHaveBeenLastCalledWith({
            kind: 'earn',
            params: { skill: 'trade', spec: '' },
        });
        cleanup();

        const again = setup({
            kind: 'earn',
            params: { skill: 'trade', spec: '' },
        });

        const spec = screen.getByRole('textbox', { name: 'Спеціалізація' });

        expect(spec).toHaveAttribute('aria-invalid', 'true');
        fireEvent.change(spec, { target: { value: 'Baker' } });
        expect(again).toHaveBeenLastCalledWith({
            kind: 'earn',
            params: { skill: 'trade', spec: 'baker' },
        });
    });

    it('train: switching to skills selects the first known skill; targets follow the kind', () => {
        const onChange = setup({
            kind: 'train',
            params: { kind: 'characteristic', key: CHARACTERISTIC_KEYS[0] },
        });

        pick('Що вивчати', 'skill');
        expect(onChange).toHaveBeenLastCalledWith({
            kind: 'train',
            params: { kind: 'skill', key: 'heal' },
        });
        pick('Ціль', CHARACTERISTIC_KEYS[2]);
        expect(onChange).toHaveBeenLastCalledWith({
            kind: 'train',
            params: { kind: 'characteristic', key: CHARACTERISTIC_KEYS[2] },
        });
    });

    it('train on skills lists the character skills with specs', () => {
        setup({ kind: 'train', params: { kind: 'skill', key: 'heal' } });

        const target = screen.getByRole('combobox', { name: 'Ціль' });

        expect(target.querySelectorAll('option')).toHaveLength(2);
    });

    it('tend: lists patients and reports the chosen id', () => {
        const onChange = setup({ kind: 'tend', params: { patientId: '' } });

        pick('Пацієнт', 'p1');
        expect(onChange).toHaveBeenLastCalledWith({
            kind: 'tend',
            params: { patientId: 'p1' },
        });
    });

    it('custom: edits the free text and shows the kind hint', () => {
        const onChange = setup({ kind: 'custom', params: { text: '' } });

        expect(
            screen.getByText('Вільний опис, без механічного ефекту.')
        ).toBeInTheDocument();
        fireEvent.change(screen.getByRole('textbox', { name: 'Опис' }), {
            target: { value: 'Ремонт даху' },
        });
        expect(onChange).toHaveBeenLastCalledWith({
            kind: 'custom',
            params: { text: 'Ремонт даху' },
        });
    });
});
