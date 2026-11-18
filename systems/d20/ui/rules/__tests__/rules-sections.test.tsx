// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionsSection } from '../ActionsSection';
import { ClassesSection } from '../ClassesSection';
import { ConcentrationSection } from '../ConcentrationSection';
import { FormulasSection } from '../FormulasSection';
import { InitiativeSection } from '../InitiativeSection';
import { SavesSection } from '../SavesSection';

import type { RulesFormState } from '@/lib/hooks/campaigns';
import { render } from '@/lib/i18n/test/render-uk';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { Ruleset } from '@/lib/utils/rules/schema';

vi.unmock('next-intl');
vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));
vi.mock('@/components/rules/RulesPaths', () => ({
    RulesItems: ({ section }: { section: string }) => <p>items:{section}</p>,
}));
vi.mock('@/components/ui/select-field', async () => ({
    SelectField: (await import('@/components/ui/__tests__/select-field-mock'))
        .SelectField,
}));

const makeForm = (patch: Partial<Ruleset> = {}) => {
    const set = vi.fn();

    return {
        set,
        form: {
            data: { ...DEFAULT_RULES, ...patch },
            set,
        } as unknown as RulesFormState,
    };
};

const toggle = (label: string) =>
    fireEvent.click(screen.getByRole('switch', { name: label }));

describe('d20 rules sections', () => {
    afterEach(cleanup);

    it('ClassesSection toggles classes while keeping the rest of the section', () => {
        const { form, set } = makeForm();

        render(<ClassesSection form={form} />);
        toggle('Увімкнути класи 5e');
        expect(set).toHaveBeenCalledWith('classes', {
            ...DEFAULT_RULES.classes,
            enabled: !DEFAULT_RULES.classes.enabled,
        });
    });

    it('SavesSection toggles save proficiency', () => {
        const { form, set } = makeForm();

        render(<SavesSection form={form} />);
        toggle('Майстерність у рятівних кидках');
        expect(set).toHaveBeenCalledWith('saves', {
            ...DEFAULT_RULES.saves,
            proficiency: !DEFAULT_RULES.saves.proficiency,
        });
    });

    it('ConcentrationSection maps the DC cap switch to 30 or null and disables it when concentration is off', () => {
        const on = makeForm({
            concentration: { enabled: true, dcCap: null },
        } as Partial<Ruleset>);

        render(<ConcentrationSection form={on.form} />);
        toggle('Межа СК 30 (2024)');
        expect(on.set).toHaveBeenLastCalledWith('concentration', {
            enabled: true,
            dcCap: 30,
        });
        cleanup();

        const off = makeForm({
            concentration: { enabled: false, dcCap: 30 },
        } as Partial<Ruleset>);

        render(<ConcentrationSection form={off.form} />);
        expect(
            screen.getByRole('switch', { name: 'Межа СК 30 (2024)' })
        ).toBeDisabled();
        expect(
            screen.getByRole('switch', { name: 'Межа СК 30 (2024)' })
        ).toBeChecked();
        toggle('Концентрація увімкнена');
        expect(off.set).toHaveBeenLastCalledWith('concentration', {
            enabled: true,
            dcCap: 30,
        });
    });

    it('ActionsSection reveals items and the 2024 variant only when enabled', () => {
        const off = makeForm({
            actions: { ...DEFAULT_RULES.actions, enabled: false },
        });

        render(<ActionsSection form={off.form} />);
        expect(screen.queryByText('items:actions')).toBeNull();
        expect(screen.queryByRole('switch', { name: /2024/ })).toBeNull();
        cleanup();

        const on = makeForm({
            actions: {
                ...DEFAULT_RULES.actions,
                enabled: true,
                variant: '2014',
            },
        });

        render(<ActionsSection form={on.form} />);
        expect(screen.getByText('items:actions')).toBeInTheDocument();
        toggle('Правила 2024 (інакше 2014)');
        expect(on.set).toHaveBeenLastCalledWith('actions', {
            ...on.form.data.actions,
            variant: '2024',
        });
    });

    it('FormulasSection previews the level-5 proficiency from the current formulas', () => {
        const { form } = makeForm({
            formulas: {
                ...DEFAULT_RULES.formulas,
                proficiencyBase: 2,
                proficiencyEvery: 4,
            },
        });

        render(<FormulasSection form={form} />);
        expect(
            screen.getByText(/Рівень 5: майстерність 3,/)
        ).toBeInTheDocument();
    });

    it('FormulasSection commits a field into the formulas object', () => {
        const { form, set } = makeForm();

        render(<FormulasSection form={form} />);

        const input = screen.getByLabelText('База DC');

        fireEvent.change(input, { target: { value: '9' } });
        fireEvent.blur(input);
        expect(set).toHaveBeenCalledWith('formulas', {
            ...DEFAULT_RULES.formulas,
            saveDcBase: 9,
        });
    });

    it('InitiativeSection switches mode and commits the hero range', () => {
        const { form, set } = makeForm();

        render(<InitiativeSection form={form} />);
        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: 'roll' },
        });
        expect(set).toHaveBeenLastCalledWith('initiative', {
            ...DEFAULT_RULES.initiative,
            mode: 'roll',
        });

        const max = screen.getByLabelText('Максимум');

        fireEvent.change(max, { target: { value: '18' } });
        fireEvent.blur(max);
        expect(set).toHaveBeenLastCalledWith('initiative', {
            ...DEFAULT_RULES.initiative,
            heroMax: 18,
        });
    });
});
