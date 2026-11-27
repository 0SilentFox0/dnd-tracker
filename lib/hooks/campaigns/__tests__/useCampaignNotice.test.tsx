// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCampaignNotice } from '@/lib/hooks/campaigns/useCampaignNotice';

let search = '';

const push = vi.fn();

vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/lib/hooks/common', () => ({
    useToasts: () => ({ toasts: [], push, dismiss: vi.fn() }),
}));
vi.mock('@/lib/i18n/use-translator', () => ({
    useTranslator: () => (key: string) => key,
}));

describe('useCampaignNotice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('pushes a toast and strips only the notice param', () => {
        search = 'notice=dmOnly&tab=x';
        window.history.replaceState(null, '', `/campaigns/c1?${search}`);

        renderHook(() => useCampaignNotice());

        expect(push).toHaveBeenCalledWith({
            id: 'notice:dmOnly',
            text: 'notices.dmOnly',
        });
        expect(window.location.pathname).toBe('/campaigns/c1');
        expect(window.location.search).toBe('?tab=x');
    });

    it('does nothing without a valid notice', () => {
        search = 'notice=bogus';
        window.history.replaceState(null, '', '/campaigns/c1?notice=bogus');

        renderHook(() => useCampaignNotice());

        expect(push).not.toHaveBeenCalled();
        expect(window.location.search).toBe('?notice=bogus');
    });
});
