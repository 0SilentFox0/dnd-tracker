// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { campaignKeys } from '../keys';
import { useUpdateCampaignRules } from '../useCampaignRules';

import { setSystemPreloader } from '@/lib/utils/rules/systems/preload';

const update = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/rules', () => ({
    getCampaignRules: vi.fn(),
    updateCampaignRules: update,
}));

describe('useUpdateCampaignRules', () => {
    it('loads the saved composition before the rules become visible', async () => {
        const saved = { system: { key: 'dnd5e', modules: ['morale'] } };

        update.mockResolvedValue(saved);

        let release!: () => void;

        const preload = vi.fn(
            () => new Promise<void>((resolve) => (release = resolve))
        );

        setSystemPreloader(preload);

        const client = new QueryClient();

        const { result } = renderHook(() => useUpdateCampaignRules('c1'), {
            wrapper: ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={client}>
                    {children}
                </QueryClientProvider>
            ),
        });

        let done!: Promise<unknown>;

        await act(async () => {
            done = result.current.mutateAsync({} as never);
            await vi.waitFor(() => expect(preload).toHaveBeenCalled());
        });

        expect(client.getQueryData(campaignKeys.rules('c1'))).toBeUndefined();

        await act(async () => {
            release();
            await done;
        });

        expect(preload).toHaveBeenCalledWith(saved.system);
        expect(client.getQueryData(campaignKeys.rules('c1'))).toEqual(saved);
    });
});
