// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { getCampaignRules } from '@/lib/api/rules';
import { useRulesForm } from '@/lib/hooks/campaigns';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

vi.mock('@/lib/api/rules', () => ({
    getCampaignRules: vi.fn(),
    updateCampaignRules: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider
        client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
    >
        <ConfirmProvider>{children}</ConfirmProvider>
    </QueryClientProvider>
);

describe('useRulesForm dirty state', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getCampaignRules).mockResolvedValue(DEFAULT_RULES);
    });

    it('tracks changed sections and drops a key set back to the server value', async () => {
        const { result } = renderHook(() => useRulesForm('c1'), { wrapper });

        await waitFor(() => expect(result.current.form).not.toBeNull());

        act(() =>
            result.current.form?.set('morale', {
                ...DEFAULT_RULES.morale,
                enabled: !DEFAULT_RULES.morale.enabled,
            })
        );

        expect(result.current.dirtyKeys.has('morale')).toBe(true);

        act(() => result.current.form?.set('morale', DEFAULT_RULES.morale));

        expect(result.current.dirtyKeys.has('morale')).toBe(false);
    });

    it('resetKey reverts only that section', async () => {
        const { result } = renderHook(() => useRulesForm('c1'), { wrapper });

        await waitFor(() => expect(result.current.form).not.toBeNull());

        act(() => {
            result.current.form?.set('morale', {
                ...DEFAULT_RULES.morale,
                cap: 1,
            });
            result.current.form?.set('initiative', {
                ...DEFAULT_RULES.initiative,
                heroMin: 2,
            });
        });

        act(() => result.current.resetKey('morale'));

        expect([...result.current.dirtyKeys]).toEqual(['initiative']);
    });

    it('initial rules skip the fetch', () => {
        const { result } = renderHook(
            () => useRulesForm('c1', { initial: DEFAULT_RULES }),
            { wrapper }
        );

        expect(result.current.form?.data.system.key).toBe(
            DEFAULT_RULES.system.key
        );

        expect(getCampaignRules).not.toHaveBeenCalled();
    });
});
