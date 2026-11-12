// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const getCampaignRules = vi.fn();

vi.mock('@/lib/api/rules', () => ({
    getCampaignRules: (...args: unknown[]) => getCampaignRules(...args),
    updateCampaignRules: vi.fn(),
}));

import { useCampaignSystem } from '@/lib/hooks/systems';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider
        client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
    >
        {children}
    </QueryClientProvider>
);

describe('useCampaignSystem', () => {
    it('falls back to the sheet key until the rules load', () => {
        getCampaignRules.mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => useCampaignSystem('c', 'dnd5e'), {
            wrapper,
        });

        expect(result.current.ready).toBe(false);
        expect(result.current.system).toEqual({ key: 'dnd5e' });
        expect(result.current.def.key).toBe('dnd5e');
    });

    it('composes the modules of the campaign', async () => {
        getCampaignRules.mockResolvedValue({
            system: { key: 'dnd5e', modules: ['skilltrees'] },
        });

        const { result } = renderHook(() => useCampaignSystem('c', 'dnd5e'), {
            wrapper,
        });

        await waitFor(() => expect(result.current.ready).toBe(true));

        expect(statColumnsOf(result.current.def).has('personalSkillId')).toBe(
            true
        );
        expect(result.current.system.modules).toEqual(['skilltrees']);
    });

    it('homm owns the archetype column', async () => {
        getCampaignRules.mockResolvedValue({ system: { key: 'homm' } });

        const { result } = renderHook(() => useCampaignSystem('c', 'homm'), {
            wrapper,
        });

        await waitFor(() => expect(result.current.ready).toBe(true));

        expect(statColumnsOf(result.current.def).has('archetype')).toBe(true);
    });
});
