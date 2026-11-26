// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    deleteAccount: vi.fn(),
    signOut: vi.fn(),
    assign: vi.fn(),
}));

vi.mock('@/lib/api/account', () => ({ deleteAccount: m.deleteAccount }));
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ auth: { signOut: m.signOut } }),
}));

import { useDeleteAccount } from '@/lib/hooks/account';

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
        {children}
    </QueryClientProvider>
);

beforeEach(() => {
    vi.clearAllMocks();
    m.signOut.mockResolvedValue({});
    Object.defineProperty(window, 'location', {
        value: { assign: m.assign },
        configurable: true,
    });
});

describe('useDeleteAccount', () => {
    it('signs out and goes home after success', async () => {
        m.deleteAccount.mockResolvedValue({ success: true });

        const { result } = renderHook(() => useDeleteAccount(), { wrapper });

        await act(() => result.current.remove('a@b.co'));

        expect(m.deleteAccount).toHaveBeenCalledWith('a@b.co');
        expect(m.signOut).toHaveBeenCalled();
        expect(m.assign).toHaveBeenCalledWith('/');
    });

    it('keeps the user on the page and exposes the error on failure', async () => {
        const err = new Error('blocked');

        m.deleteAccount.mockRejectedValue(err);

        const { result } = renderHook(() => useDeleteAccount(), { wrapper });

        await act(() => result.current.remove('a@b.co'));
        await waitFor(() => expect(result.current.error).toBe(err));

        expect(m.signOut).not.toHaveBeenCalled();
        expect(m.assign).not.toHaveBeenCalled();
    });
});
