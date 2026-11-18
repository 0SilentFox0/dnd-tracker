// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/lib/i18n/test/render-uk';
import { ArmourFields } from '@/systems/wfrp/ui/equipment/ArmourFields';
import { EncumbranceBar } from '@/systems/wfrp/ui/equipment/EncumbranceBar';
import { NumberField } from '@/systems/wfrp/ui/equipment/NumberField';
import { QualityListEditor } from '@/systems/wfrp/ui/equipment/QualityListEditor';
import { WeaponFields } from '@/systems/wfrp/ui/equipment/WeaponFields';

vi.unmock('next-intl');

vi.mock('@/components/ui/select-field', () => ({
    SelectField: (p: {
        id?: string;
        'aria-label'?: string;
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
    }) => (
        <select
            id={p.id}
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

const weapon = (over: object = {}) =>
    ({
        group: 'basic',
        reach: 'average',
        damage: { flat: 4, addSb: true },
        twoHanded: false,
        qualities: [],
        flaws: [],
        ...over,
    }) as never;

describe('NumberField', () => {
    it('maps empty input to undefined and others to numbers', () => {
        const onChange = vi.fn();

        render(
            <NumberField id="n" label="Вага" value={2} onChange={onChange} />
        );

        const input = screen.getByLabelText('Вага');

        fireEvent.change(input, { target: { value: '5' } });
        fireEvent.change(input, { target: { value: '' } });

        expect(onChange).toHaveBeenNthCalledWith(1, 5);
        expect(onChange).toHaveBeenNthCalledWith(2, undefined);
    });
});

describe('EncumbranceBar', () => {
    it('shows progress and no warning under the limit', () => {
        render(<EncumbranceBar carried={5} limit={10} over={false} />);

        expect(screen.getByText('Несете: 5 / 10')).toBeTruthy();
        expect(
            screen.getByRole('progressbar').getAttribute('aria-valuenow')
        ).toBe('5');
        expect(screen.queryByText(/Перевантаження/)).toBeNull();
    });

    it('warns when over and caps the bar at 100%', () => {
        const { container } = render(
            <EncumbranceBar carried={30} limit={10} over />
        );

        expect(screen.getByText(/Перевантаження/)).toBeTruthy();
        expect(
            (container.querySelector('[role=progressbar] > div') as HTMLElement)
                .style.width
        ).toBe('100%');
    });

    it('treats a zero limit with load as full', () => {
        const { container } = render(
            <EncumbranceBar carried={1} limit={0} over />
        );

        expect(
            (container.querySelector('[role=progressbar] > div') as HTMLElement)
                .style.width
        ).toBe('100%');
    });
});

describe('QualityListEditor', () => {
    it('lists only unused qualities of the right kind and adds one', () => {
        const onChange = vi.fn();

        render(
            <QualityListEditor
                id="q"
                label="Властивості"
                kind="quality"
                value={[{ key: 'fast' } as never]}
                onChange={onChange}
            />
        );

        const select = screen.getByRole('combobox') as HTMLSelectElement;

        const values = [...select.options].map((o) => o.value).filter(Boolean);

        expect(values).not.toContain('fast');
        expect(values.length).toBeGreaterThan(0);

        const add = screen.getByRole('button', { name: 'Додати' });

        expect((add as HTMLButtonElement).disabled).toBe(true);

        fireEvent.change(select, { target: { value: values[0] } });
        fireEvent.click(add);

        const added = onChange.mock.calls[0][0].at(-1);

        expect(added.key).toBe(values[0]);
    });

    it('removes an item by its labelled button', () => {
        const onChange = vi.fn();

        render(
            <QualityListEditor
                id="q"
                label="Властивості"
                kind="quality"
                value={[{ key: 'fast' } as never]}
                onChange={onChange}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Прибрати:/ }));

        expect(onChange).toHaveBeenCalledWith([]);
    });
});

describe('ArmourFields', () => {
    const armour = {
        locations: { head: 1, body: 2, arms: 0, legs: 0 },
        kind: 'leather',
        qualities: [],
    } as never;

    it('writes AP per location, defaulting empty input to 0', () => {
        const onChange = vi.fn();

        render(<ArmourFields value={armour} onChange={onChange} />);

        fireEvent.change(document.getElementById('wfrp-ap-head')!, {
            target: { value: '4' },
        });

        expect(onChange.mock.calls[0][0].locations.head).toBe(4);

        fireEvent.change(document.getElementById('wfrp-ap-body')!, {
            target: { value: '' },
        });

        expect(onChange.mock.calls[1][0].locations.body).toBe(0);
    });

    it('changes armour kind', () => {
        const onChange = vi.fn();

        render(<ArmourFields value={armour} onChange={onChange} />);

        const kind = document.getElementById(
            'wfrp-armour-kind'
        ) as HTMLSelectElement;

        const next = [...kind.options].find(
            (o) => o.value && o.value !== 'leather'
        )!;

        fireEvent.change(kind, { target: { value: next.value } });

        expect(onChange.mock.calls[0][0].kind).toBe(next.value);
    });
});

describe('WeaponFields', () => {
    it('switching to ranged drops reach and sets a default range', () => {
        const onChange = vi.fn();

        render(<WeaponFields value={weapon()} onChange={onChange} />);
        fireEvent.change(document.getElementById('wfrp-weapon-kind')!, {
            target: { value: 'ranged' },
        });

        const next = onChange.mock.calls[0][0];

        expect(next.range).toBe(30);
        expect('reach' in next).toBe(false);
    });

    it('switching to melee drops range and ammo-free reach defaults', () => {
        const onChange = vi.fn();

        render(
            <WeaponFields
                value={weapon({ reach: undefined, range: 20, ammoCapacity: 5 })}
                onChange={onChange}
            />
        );

        expect(document.getElementById('wfrp-weapon-range')).toBeTruthy();
        expect(document.getElementById('wfrp-weapon-reach')).toBeNull();

        fireEvent.change(document.getElementById('wfrp-weapon-kind')!, {
            target: { value: 'melee' },
        });

        const next = onChange.mock.calls[0][0];

        expect(next.reach).toBe('average');
        expect('range' in next).toBe(false);
    });

    it('clearing ammo removes ammoCapacity', () => {
        const onChange = vi.fn();

        render(
            <WeaponFields
                value={weapon({ reach: undefined, range: 20, ammoCapacity: 5 })}
                onChange={onChange}
            />
        );
        fireEvent.change(document.getElementById('wfrp-weapon-ammo')!, {
            target: { value: '' },
        });

        expect('ammoCapacity' in onChange.mock.calls[0][0]).toBe(false);
    });

    it('edits flat damage and toggles two-handed', () => {
        const onChange = vi.fn();

        render(<WeaponFields value={weapon()} onChange={onChange} />);
        fireEvent.change(document.getElementById('wfrp-weapon-damage')!, {
            target: { value: '-2' },
        });

        expect(onChange.mock.calls[0][0].damage).toEqual({
            flat: -2,
            addSb: true,
        });

        fireEvent.click(screen.getByRole('checkbox', { name: 'Дворучна' }));

        expect(onChange.mock.calls[1][0].twoHanded).toBe(true);
    });
});
