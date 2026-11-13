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

const toggle = vi.fn();

const form = {
    campaignId: 'c1',
    data: DEFAULT_RULES,
    set,
} as unknown as RulesFormState;

const modulesOf = (
    toggles: ModuleToggle[],
    isPending = false
): ReturnType<typeof useCampaignModules> => ({ toggles, toggle, isPending });

const forSystem = (system: { key: string; modules?: string[] }) =>
    modulesOf(moduleToggles(system));

const switchOf = (id: string) =>
    document.getElementById(`rules-module-${id}`) as HTMLElement;

const renderWith = (
    modules: ReturnType<typeof useCampaignModules>,
    options: { locked?: boolean; dirty?: boolean } = {}
) =>
    render(
        <SystemSection
            form={form}
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

    it('a click reports the module and the new state', () => {
        renderWith(forSystem({ key: 'dnd5e' }));

        fireEvent.click(switchOf('morale'));

        expect(toggle).toHaveBeenCalledWith('morale', true);
    });

    it('an unavailable module is disabled and says why', () => {
        renderWith(
            modulesOf([
                {
                    id: 'morale',
                    active: true,
                    available: false,
                    reason: { code: 'requiredBy', module: 'retaliation' },
                    toggle: 'free',
                },
            ])
        );

        expect(switchOf('morale').hasAttribute('disabled')).toBe(true);
        expect(
            screen.getByText(/rules\.system\.modules\.requiredBy/)
        ).toBeTruthy();
    });

    it('marks modules that change heroes', () => {
        renderWith(forSystem({ key: 'dnd5e' }));

        expect(
            screen.getAllByText('rules.system.modules.setupBadge')
        ).toHaveLength(2);
    });
});
