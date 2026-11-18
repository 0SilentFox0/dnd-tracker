// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RulesFormState } from '@/lib/hooks/campaigns';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { HeroScalingSection } from '@/systems/heroscaling/ui/HeroScalingSection';

const heroScaling = DEFAULT_RULES.heroScaling;

const renderSection = () => {
    const set = vi.fn();

    const form: RulesFormState = { campaignId: 'c1', data: DEFAULT_RULES, set };

    render(<HeroScalingSection form={form} />);

    return set;
};

const commit = (label: string, value: string) => {
    const input = screen.getByLabelText(label);

    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
};

describe('HeroScalingSection', () => {
    afterEach(cleanup);

    it('committing HP base levels saves the heroScaling section with the new value', () => {
        const set = renderSection();

        commit('rulesHeroScaling.hpBaseLevels', '4');

        expect(set).toHaveBeenCalledWith('heroScaling', {
            ...heroScaling,
            hpBaseLevels: 4,
        });
    });

    it('clamps the HP base levels to the 0..10 range', () => {
        const set = renderSection();

        commit('rulesHeroScaling.hpBaseLevels', '99');

        expect(set).toHaveBeenCalledWith('heroScaling', {
            ...heroScaling,
            hpBaseLevels: 10,
        });
    });

    it('editing the ranged table does not touch the melee table', () => {
        const set = renderSection();

        const input = screen.getByLabelText(
            `rules.diceTable.levelLabel ${JSON.stringify({ title: 'rulesHeroScaling.ranged', level: 1 })}`
        );

        fireEvent.change(input, { target: { value: '3d4' } });

        expect(set).toHaveBeenCalledWith('heroScaling', {
            ...heroScaling,
            rangedDiceByLevel: { ...heroScaling.rangedDiceByLevel, '1': '3d4' },
        });
    });
});
