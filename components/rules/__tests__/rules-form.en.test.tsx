// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RulesForm } from '../RulesForm';

import { mockMatchMedia } from '@/components/ui/__tests__/match-media';

vi.unmock('next-intl');

import '@/components/systems/registry';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/rules',
    useSearchParams: () => new URLSearchParams(),
}));
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
    useUpdateCampaignRules: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('RulesForm (en)', () => {
    beforeEach(() => mockMatchMedia(false));

    afterEach(cleanup);

    it('renders the morale section in English without raw keys', async () => {
        await renderWithIntl(
            <ConfirmProvider>
                <RulesForm campaignId="c1" title="T" />
            </ConfirmProvider>,
            {
                locale: 'en',
                namespaces: [
                    'common',
                    'validation',
                    'rules',
                    'rulesMorale',
                    'rulesHeroScaling',
                    'rulesDeathSaves',
                    'rulesInspiration',
                    'gameTerms',
                    'battleTerms',
                ],
            }
        );

        expect(screen.getByLabelText('Cap ±N')).toBeTruthy();
        expect(
            screen.getAllByRole('switch', { name: 'Enabled' }).length
        ).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
        expect(screen.getByText(/Changes apply to new battles/)).toBeTruthy();
        expect(document.body.textContent).not.toMatch(/rules\./);
    });
});
