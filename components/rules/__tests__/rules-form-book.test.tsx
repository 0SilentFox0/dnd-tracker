// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RulesForm } from '../RulesForm';

import '@/components/systems/registry';
import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';
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
vi.mock('@/lib/hooks/campaigns/useCampaignModules', () => ({
    useCampaignModules: () => ({
        toggles: [],
        toggle: vi.fn(),
        isPending: false,
    }),
}));
vi.mock('@/lib/hooks/campaigns/useCampaignRules', () => ({
    useCampaignRules: () => ({ data: DEFAULT_RULES, isLoading: false }),
    useUpdateCampaignRules: () => ({
        mutateAsync: vi.fn().mockResolvedValue(DEFAULT_RULES),
        isPending: false,
    }),
}));

beforeEach(() => mockMatchMedia(false));

afterEach(cleanup);

const render = () => renderWithConfirm(<RulesForm campaignId="c1" title="T" />);

const toggleMorale = () =>
    fireEvent.click(
        screen.getByRole('switch', { name: 'rulesMorale.enabled' })
    );

describe('RulesForm book layout', () => {
    it('lists the groups as table-of-contents headings', () => {
        render();

        for (const group of ['system', 'combat', 'characters', 'world'])
            expect(screen.getByText(`rules.page.groups.${group}`)).toBeTruthy();

        expect(screen.queryByText('rules.page.groups.other')).toBeNull();
    });

    it('marks a changed section and resets it', () => {
        render();

        expect(
            screen.queryByRole('img', { name: 'rules.page.changed' })
        ).toBeNull();

        toggleMorale();

        expect(
            screen.getAllByRole('img', { name: 'rules.page.changed' })
        ).toHaveLength(1);

        const resets = screen.getAllByRole('button', {
            name: /^rules\.page\.resetSection/,
        });

        expect(resets).toHaveLength(2);

        fireEvent.click(resets[0]);

        expect(
            screen.queryByRole('img', { name: 'rules.page.changed' })
        ).toBeNull();
        expect(
            screen.getByRole('switch', { name: 'rulesMorale.enabled' })
        ).toBeChecked();
    });

    it('filter hides triggers but keeps the panels mounted', async () => {
        render();

        fireEvent.change(screen.getByRole('searchbox'), {
            target: { value: 'initiative' },
        });

        await waitFor(() =>
            expect(
                screen.queryByRole('tab', {
                    name: 'rules.mechanics.saves.label',
                })
            ).toBeNull()
        );

        expect(
            screen.getByRole('tab', {
                name: 'rules.mechanics.initiative.label',
            })
        ).toBeTruthy();
        expect(screen.getByLabelText('rulesMorale.cap')).toBeTruthy();
    });

    it('an invalid field in a filtered-out section reveals that section', async () => {
        render();

        fireEvent.change(screen.getByRole('searchbox'), {
            target: { value: 'initiative' },
        });

        await waitFor(() =>
            expect(
                screen.queryByRole('tab', { name: 'rulesMorale.label' })
            ).toBeNull()
        );

        const cap = screen.getByLabelText(
            'rulesMorale.cap'
        ) as HTMLInputElement;

        cap.setCustomValidity('bad');
        fireEvent.invalid(cap);

        await waitFor(() =>
            expect(cap.closest('[role="tabpanel"]')).toHaveAttribute(
                'data-state',
                'active'
            )
        );
    });
});
