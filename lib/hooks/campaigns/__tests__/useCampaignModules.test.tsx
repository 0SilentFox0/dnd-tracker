// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { updateCampaignRules } from '@/lib/api/rules';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { useCampaignModules } from '@/lib/hooks/campaigns';
import { campaignKeys } from '@/lib/hooks/campaigns/keys';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { CampaignRulesView } from '@/types/campaigns';

const refresh = vi.fn();

const confirm = vi.fn();

const notify = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/api/rules', () => ({
    getCampaignRules: vi.fn(),
    updateCampaignRules: vi.fn(),
}));
vi.mock('@/lib/hooks/common', () => ({
    useConfirm: () => confirm,
    useNotify: () => notify,
}));

const view = (
    system: { key: string; modules?: string[] },
    systemLocked = false
): CampaignRulesView => ({ ...DEFAULT_RULES, system, systemLocked });

const setup = (rules: CampaignRulesView) => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    client.setQueryData(campaignKeys.rules('c1'), rules);
    client.setQueryData(['campaign-members', 'c1'], ['m']);

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    return {
        client,
        ...renderHook(() => useCampaignModules('c1'), { wrapper }),
    };
};

beforeEach(() => {
    vi.clearAllMocks();
    confirm.mockResolvedValue(true);
});

describe('useCampaignModules', () => {
    it('toggles come from the server data', () => {
        const { result } = setup(view({ key: 'dnd5e', modules: ['morale'] }));

        expect(
            result.current.toggles.find((t) => t.id === 'morale')?.active
        ).toBe(true);
    });

    it('a free module: sends the patch, stores the view, refreshes the rest', async () => {
        const next = view({ key: 'dnd5e', modules: ['morale'] });

        vi.mocked(updateCampaignRules).mockResolvedValue(next);

        const { client, result } = setup(view({ key: 'dnd5e' }));

        const invalidate = vi.spyOn(client, 'invalidateQueries');

        await act(() => result.current.toggle('morale', true));

        expect(updateCampaignRules).toHaveBeenCalledWith('c1', {
            system: { modules: ['morale'] },
        });
        expect(confirm).not.toHaveBeenCalled();
        expect(client.getQueryData(campaignKeys.rules('c1'))).toEqual(next);
        expect(refresh).toHaveBeenCalled();

        const { predicate } = invalidate.mock.calls[0][0] as {
            predicate: (q: { queryKey: readonly unknown[] }) => boolean;
        };

        expect(predicate({ queryKey: campaignKeys.rules('c1') })).toBe(false);
        expect(predicate({ queryKey: ['campaign-members', 'c1'] })).toBe(true);
    });

    it('a setup module in a campaign with heroes asks before the request', async () => {
        vi.mocked(updateCampaignRules).mockResolvedValue(
            view({ key: 'homm', modules: [] }, true)
        );

        const { result } = setup(view({ key: 'homm' }, true));

        await act(() => result.current.toggle('heroscaling', false));

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(vi.mocked(updateCampaignRules).mock.calls[0][1]).toMatchObject({
            confirm: true,
        });
    });

    it('declining the confirmation sends nothing', async () => {
        confirm.mockResolvedValue(false);

        const { result } = setup(view({ key: 'homm' }, true));

        await act(() => result.current.toggle('heroscaling', false));

        expect(updateCampaignRules).not.toHaveBeenCalled();
    });

    it('a server 409 for confirmation asks and retries once with confirm', async () => {
        vi.mocked(updateCampaignRules)
            .mockRejectedValueOnce(
                new ApiError(
                    'x',
                    409,
                    '/rules',
                    undefined,
                    API_ERRORS.SYSTEM_MODULE_CONFIRM
                )
            )
            .mockResolvedValueOnce(view({ key: 'homm', modules: [] }));

        const { result } = setup(view({ key: 'homm' }, false));

        await act(() => result.current.toggle('skilltrees', false));
        await waitFor(() =>
            expect(updateCampaignRules).toHaveBeenCalledTimes(2)
        );

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(vi.mocked(updateCampaignRules).mock.calls[1][1]).toMatchObject({
            confirm: true,
        });
    });

    it('any other error goes to notify', async () => {
        vi.mocked(updateCampaignRules).mockRejectedValue(new Error('boom'));

        const { result } = setup(view({ key: 'dnd5e' }));

        await act(() => result.current.toggle('morale', true));

        expect(notify).toHaveBeenCalledWith('boom');
        expect(refresh).not.toHaveBeenCalled();
    });
});
