// @vitest-environment happy-dom
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RulesForm } from '../RulesForm';

import '@/components/ui/__tests__/match-media';
import '@/components/systems/registry';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

const mutateAsync = vi.fn().mockResolvedValue(DEFAULT_RULES);

vi.mock('@/lib/hooks/campaigns/useRemoveCustomCondition', () => ({
    useRemoveCustomCondition: () => ({
        remove: vi.fn(),
        isPending: false,
        usage: null,
        closeUsage: vi.fn(),
    }),
}));

vi.mock('@/lib/hooks/campaigns/useRemoveCustomCondition', () => ({
    useRemoveCustomCondition: () => ({
        remove: vi.fn(),
        isPending: false,
        usage: null,
        closeUsage: vi.fn(),
    }),
}));

vi.mock('@/lib/hooks/campaigns/useCampaignModules', () => ({
    useCampaignModules: () => ({
        toggles: [],
        toggle: vi.fn(),
        isPending: false,
    }),
}));
vi.mock('@/lib/hooks/campaigns/useCampaignRules', () => ({
    useCampaignRules: () => ({ data: DEFAULT_RULES, isLoading: false }),
    useUpdateCampaignRules: () => ({ mutateAsync, isPending: false }),
}));

describe('RulesForm', () => {
    it('disabling morale locks the cap and saves only the morale section', async () => {
        renderWithConfirm(<RulesForm campaignId="c1" />);

        expect(
            screen.getByLabelText('rulesMorale.cap')
        ).not.toBeDisabled();

        fireEvent.click(
            screen.getByRole('switch', {
                name: 'rulesMorale.enabled',
            })
        );

        expect(
            screen.getByLabelText('rulesMorale.cap')
        ).toBeDisabled();

        fireEvent.click(
            screen.getByRole('button', { name: 'common.actions.save' })
        );

        await vi.waitFor(() =>
            expect(mutateAsync).toHaveBeenCalledWith({
                morale: { enabled: false, cap: 3 },
            })
        );
    });
});
