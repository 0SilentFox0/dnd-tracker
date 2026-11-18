// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RulesFormState } from '@/lib/hooks/campaigns';
import type { Ruleset } from '@/lib/utils/rules';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { MoraleSection } from '@/systems/morale/ui/MoraleSection';

const renderSection = (enabled: boolean) => {
    const set = vi.fn();

    const data: Ruleset = {
        ...DEFAULT_RULES,
        morale: { ...DEFAULT_RULES.morale, enabled, cap: 3 },
    };

    const form: RulesFormState = { campaignId: 'c1', data, set };

    render(<MoraleSection form={form} />);

    return { set, morale: data.morale };
};

describe('MoraleSection', () => {
    afterEach(cleanup);

    it('locks the cap while morale is off', () => {
        renderSection(false);

        expect(screen.getByLabelText('rulesMorale.cap')).toBeDisabled();
    });

    it('committing the cap saves the clamped value into the morale section', () => {
        const { set, morale } = renderSection(true);

        const input = screen.getByLabelText('rulesMorale.cap');

        fireEvent.change(input, { target: { value: '50' } });
        fireEvent.blur(input);

        expect(set).toHaveBeenCalledWith('morale', { ...morale, cap: 10 });
    });

    it('the switch saves enabled', () => {
        const { set, morale } = renderSection(false);

        fireEvent.click(
            screen.getByRole('switch', { name: 'rulesMorale.enabled' })
        );

        expect(set).toHaveBeenCalledWith('morale', {
            ...morale,
            enabled: true,
        });
    });
});
