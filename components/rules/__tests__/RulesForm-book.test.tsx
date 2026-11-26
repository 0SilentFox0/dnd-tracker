// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RulesForm } from '../RulesForm';

import '@/components/ui/__tests__/match-media';
import '@/components/systems/registry';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

const nav = vi.hoisted(() => ({ section: null as string | null }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/campaigns/c1/dm/rules',
    useSearchParams: () =>
        new URLSearchParams(nav.section ? `section=${nav.section}` : ''),
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

afterEach(() => {
    cleanup();
    nav.section = null;
});

describe('RulesForm book layout', () => {
    it('groups the contents and filters sections', () => {
        renderWithConfirm(<RulesForm campaignId="c1" />);

        expect(screen.getByText('rules.page.groups.combat')).toBeTruthy();
        expect(screen.getByText('rules.page.groups.world')).toBeTruthy();

        fireEvent.change(screen.getByRole('searchbox'), {
            target: { value: 'zzz-no-such-section' },
        });

        expect(screen.queryByText('rules.page.groups.combat')).toBeNull();
    });

    it('marks a changed section and resets only that one', () => {
        renderWithConfirm(<RulesForm campaignId="c1" />);

        fireEvent.click(
            screen.getByRole('switch', { name: 'rulesMorale.enabled' })
        );

        expect(screen.getByText('rules.page.changed')).toBeTruthy();

        const toc = screen.getByRole('tablist');

        expect(
            within(toc).getAllByRole('img', { name: 'rules.page.changedBadge' })
        ).toHaveLength(1);

        fireEvent.click(screen.getAllByText('rules.page.resetSection')[0]);

        expect(screen.queryByText('rules.page.changed')).toBeNull();
    });

    it('opens the section named in ?section=', () => {
        nav.section = 'initiative';

        renderWithConfirm(<RulesForm campaignId="c1" />);

        expect(
            screen
                .getByRole('tab', { name: 'rules.mechanics.initiative.label' })
                .getAttribute('data-state')
        ).toBe('active');
    });

    it('demo is read-only: no JSON dump, no save, disabled controls', () => {
        const { container } = renderWithConfirm(
            <RulesForm campaignId="c1" initial={DEFAULT_RULES} />
        );

        expect(container.querySelector('pre')).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'common.actions.save' })
        ).toBeNull();
        expect(screen.getByText('rules.page.demoReadOnly')).toBeTruthy();
        expect(container.querySelector('fieldset')?.disabled).toBe(true);
    });
});
