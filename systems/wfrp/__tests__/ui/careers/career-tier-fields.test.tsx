// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/lib/i18n/test/render-uk';
import { CareerSkillPicker } from '@/systems/wfrp/ui/careers/CareerSkillPicker';
import { CareerTierFields } from '@/systems/wfrp/ui/careers/CareerTierFields';

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

const tier = (over: object = {}) => ({
    name: 'Писар',
    characteristics: ['ws'],
    skills: ['charm'],
    talents: ['f1'],
    trappings: ['Перо'],
    ...over,
});

const feats = [
    { id: 'f1', name: 'Блискавка' },
    { id: 'f2', name: 'Стійкість' },
] as never;

describe('CareerTierFields', () => {
    it('edits the tier name and toggles a characteristic', () => {
        const onChange = vi.fn();

        render(
            <CareerTierFields
                index={0}
                tier={tier() as never}
                feats={feats}
                onChange={onChange}
            />
        );
        fireEvent.change(document.getElementById('career-tier-0-name')!, {
            target: { value: 'Старший писар' },
        });

        expect(onChange).toHaveBeenLastCalledWith({ name: 'Старший писар' });

        const pressed = screen
            .getAllByRole('button')
            .filter((b) => b.getAttribute('aria-pressed') === 'true');

        expect(pressed).toHaveLength(1);

        fireEvent.click(pressed[0]);

        expect(onChange).toHaveBeenLastCalledWith({ characteristics: [] });

        const other = screen
            .getAllByRole('button')
            .find((b) => b.getAttribute('aria-pressed') === 'false')!;

        fireEvent.click(other);

        expect(onChange.mock.calls.at(-1)![0].characteristics).toHaveLength(2);
    });

    it('removes a talent chip and offers only unused feats', () => {
        const onChange = vi.fn();

        render(
            <CareerTierFields
                index={1}
                tier={tier() as never}
                feats={feats}
                onChange={onChange}
            />
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Прибрати: Блискавка' })
        );

        expect(onChange).toHaveBeenLastCalledWith({ talents: [] });

        const options = Array.from(
            screen.getByLabelText('Додати талант').querySelectorAll('option')
        ).map((o) => o.textContent);

        expect(options).toContain('Стійкість');
        expect(options).not.toContain('Блискавка');
    });

    it('adds a talent from the select', () => {
        const onChange = vi.fn();

        render(
            <CareerTierFields
                index={0}
                tier={tier() as never}
                feats={feats}
                onChange={onChange}
            />
        );
        fireEvent.change(screen.getByLabelText('Додати талант'), {
            target: { value: 'f2' },
        });

        expect(onChange).toHaveBeenLastCalledWith({ talents: ['f1', 'f2'] });
    });
});

describe('CareerSkillPicker', () => {
    const skillSelect = () => screen.getByLabelText('Навичка');

    it('keeps add disabled until a skill is chosen, then emits its key', () => {
        const onAdd = vi.fn();

        render(<CareerSkillPicker onAdd={onAdd} />);

        const add = screen.getByRole('button', { name: 'Додати' });

        expect((add as HTMLButtonElement).disabled).toBe(true);

        fireEvent.change(skillSelect(), { target: { value: 'charm' } });

        expect((add as HTMLButtonElement).disabled).toBe(false);

        fireEvent.click(add);

        expect(onAdd).toHaveBeenCalledWith('charm');
        expect((skillSelect() as HTMLSelectElement).value).toBe('');
    });

    it('validates an open specialisation before adding', () => {
        const onAdd = vi.fn();

        render(<CareerSkillPicker onAdd={onAdd} />);
        fireEvent.change(skillSelect(), { target: { value: 'lore' } });

        const spec = screen.getByLabelText('Спеціалізація');

        const add = screen.getByRole('button', { name: 'Додати' });

        fireEvent.change(spec, { target: { value: 'Bad Spec!' } });

        expect((add as HTMLButtonElement).disabled).toBe(true);

        fireEvent.change(spec, { target: { value: 'Heraldry' } });
        fireEvent.click(add);

        expect(onAdd).toHaveBeenCalledWith('lore:heraldry');
    });
});
