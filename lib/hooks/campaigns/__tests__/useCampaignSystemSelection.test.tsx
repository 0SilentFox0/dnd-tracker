// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignKeys } from '../keys';
import { useCampaignSystemSelection } from '../useCampaignSystemSelection';

const getRules = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/rules', () => ({
    getCampaignRules: getRules,
    updateCampaignRules: vi.fn(),
}));

beforeEach(() => {
    getRules.mockClear();
});

const setup = (seed?: object) => {
    const client = new QueryClient();

    if (seed) client.setQueryData(campaignKeys.system('c1'), seed);

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    return { client, wrapper };
};

describe('useCampaignSystemSelection', () => {
    it('returns the seeded system from the first render', () => {
        getRules.mockReturnValue(new Promise(() => undefined));

        const { wrapper } = setup({ key: 'dnd5e', modules: ['morale'] });

        const { result } = renderHook(() => useCampaignSystemSelection(''), {
            wrapper,
        });

        expect(result.current).toBeUndefined();

        const seeded = renderHook(() => useCampaignSystemSelection('c1'), {
            wrapper,
        });

        expect(seeded.result.current).toEqual({
            key: 'dnd5e',
            modules: ['morale'],
        });
    });

    it('is undefined without a seed and never requests the seeded key', () => {
        const { wrapper } = setup();

        const { result } = renderHook(() => useCampaignSystemSelection(''), {
            wrapper,
        });

        expect(result.current).toBeUndefined();
        expect(getRules).not.toHaveBeenCalled();
    });
});
