// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SystemSection } from '../sections/SystemSection';

import '@/components/ui/__tests__/match-media';
import type { RulesFormState, useCampaignModules } from '@/lib/hooks/campaigns';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import {
    type ModuleToggle,
    moduleToggles,
} from '@/lib/utils/rules/systems/catalog';

const set = vi.fn();


const apply = vi.fn();

const formOf = (system: { key: string; modules?: string[] }) =>
    ({
        campaignId: 'c1',
        data: { ...DEFAULT_RULES, system },
        set,
    }) as unknown as RulesFormState;

const modulesOf = (
    toggles: ModuleToggle[],
    isPending = false
): ReturnType<typeof useCampaignModules> => ({
    toggles,
    apply,
    isPending,
});

const forSystem = (system: { key: string; modules?: string[] }) => ({
    system,
    modules: modulesOf(moduleToggles(system)),
});

const switchOf = (id: string) =>
    document.getElementById(`rules-module-${id}`) as HTMLElement;

const renderWith = (
    { system, modules }: ReturnType<typeof forSystem>,
    options: { locked?: boolean; dirty?: boolean } = {}
) =>
    render(
        <SystemSection
            form={formOf(system)}
            locked={options.locked ?? false}
            modules={modules}
            dirty={options.dirty ?? false}
        />
    );

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('SystemSection', () => {
    it('offers the three systems and reports a change', () => {
        renderWith(forSystem({ key: 'homm' }));

        const trigger = screen.getByRole('combobox', {
            name: 'rules.system.label',
        });

        expect(trigger).not.toBeDisabled();

        fireEvent.click(trigger);

        expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(
            [
                'gameTerms.ruleSystem.dnd5e',
                'gameTerms.ruleSystem.homm',
                'gameTerms.ruleSystem.wfrp',
            ]
        );

        fireEvent.click(
            screen.getByRole('option', { name: 'gameTerms.ruleSystem.wfrp' })
        );

        expect(set).toHaveBeenCalledWith('system', { key: 'wfrp' });
    });

    it('locked disables the select and shows the hint', () => {
        renderWith(forSystem({ key: 'homm' }), { locked: true });

        expect(
            screen.getByRole('combobox', { name: 'rules.system.label' })
        ).toBeDisabled();
        expect(screen.getByText('rules.system.lockedHint')).toBeTruthy();
    });
});

describe('SystemSection module switches', () => {
    it('homm: six switches, all on', () => {
        renderWith(forSystem({ key: 'homm' }));

        const switches = screen.getAllByRole('switch');

        expect(switches).toHaveLength(6);
        expect(
            switches.every((s) => s.getAttribute('aria-checked') === 'true')
        ).toBe(true);
    });

    it('dnd5e: six switches, all off and enabled', () => {
        renderWith(forSystem({ key: 'dnd5e' }));

        const switches = screen.getAllByRole('switch');

        expect(switches).toHaveLength(6);
        expect(
            switches.every(
                (s) =>
                    s.getAttribute('aria-checked') === 'false' &&
                    !s.hasAttribute('disabled')
            )
        ).toBe(true);
    });

    it('wfrp: no module block', () => {
        renderWith(forSystem({ key: 'wfrp' }));

        expect(screen.queryAllByRole('switch')).toHaveLength(0);
        expect(screen.queryByText('rules.system.modules.title')).toBeNull();
    });

    it('unsaved changes disable every switch and show the hint', () => {
        renderWith(forSystem({ key: 'dnd5e' }), { dirty: true });

        expect(screen.getByText('rules.system.modules.dirtyHint')).toBeTruthy();
        expect(
            screen
                .getAllByRole('switch')
                .every((s) => s.hasAttribute('disabled'))
        ).toBe(true);
    });

    it('toggles edit a local draft and apply sends it once', () => {
        renderWith(forSystem({ key: 'dnd5e' }));

        fireEvent.click(switchOf('morale'));

        expect(apply).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('rules.system.wizard.next'));

        expect(screen.getByTestId('module-summary').textContent).toContain(
            'gameTerms.module.morale.name'
        );

        fireEvent.click(screen.getByText('rules.system.wizard.apply'));

        expect(apply).toHaveBeenCalledWith({
            key: 'dnd5e',
            modules: ['morale'],
        });
    });

    it('review stays disabled until something changes', () => {
        renderWith(forSystem({ key: 'dnd5e' }));

        expect(
            screen.getByText('rules.system.wizard.next').closest('button')
        ).toBeDisabled();
    });

    it('marks modules that change heroes', () => {
        renderWith(forSystem({ key: 'dnd5e' }));

        expect(
            screen.getAllByText('rules.system.modules.setupBadge')
        ).toHaveLength(2);
    });
});
