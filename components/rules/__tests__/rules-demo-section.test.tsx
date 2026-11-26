// @vitest-environment happy-dom
import { act, cleanup, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RulesForm } from '../RulesForm';
import { useRulesSection } from '../useRulesSection';

import '@/components/ui/__tests__/match-media';
import '@/components/systems/registry';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

const nav = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    search: '',
    mobile: false,
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: nav.push, replace: nav.replace, back: nav.back }),
    usePathname: () => '/rules',
    useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock('@/lib/hooks/common/useIsMobile', () => ({
    useIsCompact: () => nav.mobile,
    useIsMobile: () => nav.mobile,
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
        mutateAsync: vi.fn(),
        isPending: false,
    }),
}));

afterEach(() => {
    cleanup();
    Object.assign(nav, { search: '', mobile: false });
    vi.clearAllMocks();
});

describe('read-only rules demo', () => {
    it('renders disabled fieldsets and a banner, without save or JSON', () => {
        const { container } = renderWithConfirm(
            <RulesForm campaignId="c1" title="T" readOnly />
        );

        expect(container.querySelector('pre')).toBeNull();
        expect(container.querySelector('fieldset[disabled]')).not.toBeNull();
        expect(screen.getByText('rules.page.demoReadOnly')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'common.actions.save' })).toBeNull();
    });
});

describe('useRulesSection', () => {
    const keys = ['system', 'initiative'];

    it('reads a known section from the URL', () => {
        nav.search = 'section=initiative';

        const { result } = renderHook(() => useRulesSection(keys));

        expect(result.current.section).toBe('initiative');
    });

    it('ignores an unknown key', () => {
        nav.search = 'section=nope';

        const { result } = renderHook(() => useRulesSection(keys));

        expect(result.current.section).toBeNull();
    });

    it('replaces on desktop and pushes on phone', () => {
        const { result } = renderHook(() => useRulesSection(keys));

        act(() => result.current.setSection('initiative'));
        expect(nav.replace).toHaveBeenCalledWith('/rules?section=initiative', {
            scroll: false,
        });

        nav.mobile = true;

        const phone = renderHook(() => useRulesSection(keys));

        act(() => phone.result.current.setSection('system'));
        expect(nav.push).toHaveBeenCalledWith('/rules?section=system', {
            scroll: false,
        });

        act(() => phone.result.current.setSection(null));
        expect(nav.back).toHaveBeenCalled();
    });
});
