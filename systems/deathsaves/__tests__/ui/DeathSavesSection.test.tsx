// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RulesFormState } from '@/lib/hooks/campaigns';
import type { Ruleset } from '@/lib/utils/rules';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { DeathSavesSection } from '@/systems/deathsaves/ui/rules/DeathSavesSection';

const renderSection = (enabled: boolean) => {
    const set = vi.fn();

    const data: Ruleset = {
        ...DEFAULT_RULES,
        deathSaves: { ...DEFAULT_RULES.deathSaves, enabled },
    };

    render(
        <DeathSavesSection
            form={{ campaignId: 'c1', data, set } as RulesFormState}
        />
    );

    return { set, deathSaves: data.deathSaves };
};

describe('DeathSavesSection', () => {
    afterEach(cleanup);

    it('hides the units toggle while death saves are off', () => {
        renderSection(false);

        expect(screen.queryByText('rulesDeathSaves.unitsDieAtZero')).toBeNull();
    });

    it('shows the units toggle when enabled and saves its flip', () => {
        const { set, deathSaves } = renderSection(true);

        fireEvent.click(
            screen.getByRole('switch', {
                name: 'rulesDeathSaves.unitsDieAtZero',
            })
        );

        expect(set).toHaveBeenCalledWith('deathSaves', {
            ...deathSaves,
            unitsDieAtZero: !deathSaves.unitsDieAtZero,
        });
    });

    it('the main switch saves enabled', () => {
        const { set, deathSaves } = renderSection(false);

        fireEvent.click(
            screen.getByRole('switch', { name: 'rulesDeathSaves.enabled' })
        );

        expect(set).toHaveBeenCalledWith('deathSaves', {
            ...deathSaves,
            enabled: true,
        });
    });
});
