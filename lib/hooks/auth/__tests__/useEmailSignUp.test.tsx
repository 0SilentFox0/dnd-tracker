// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signUp = vi.hoisted(() => vi.fn());

const replace = vi.hoisted(() => vi.fn());

let search = 'next=%2Fjoin%2FAB3K9Z';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace, refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ auth: { signUp } }),
}));

import { useEmailSignUp } from '../useEmailAuth';

const values = { displayName: 'A', email: 'a@b.c', password: 'password1' };

beforeEach(() => {
    vi.clearAllMocks();
    search = 'next=%2Fjoin%2FAB3K9Z';
});

describe('useEmailSignUp', () => {
    it('puts next into emailRedirectTo', async () => {
        signUp.mockResolvedValue({ data: { session: null }, error: null });

        const { result } = renderHook(() => useEmailSignUp());

        await act(() => result.current.signUp(values as never));

        const url = new URL(signUp.mock.calls[0][0].options.emailRedirectTo);

        expect(url.searchParams.get('next')).toBe('/join/AB3K9Z');
    });

    it('immediate session goes to next', async () => {
        signUp.mockResolvedValue({ data: { session: {} }, error: null });

        const { result } = renderHook(() => useEmailSignUp());

        await act(() => result.current.signUp(values as never));

        expect(replace).toHaveBeenCalledWith('/join/AB3K9Z');
    });

    it('falls back to /campaigns without next', async () => {
        search = '';
        signUp.mockResolvedValue({ data: { session: {} }, error: null });

        const { result } = renderHook(() => useEmailSignUp());

        await act(() => result.current.signUp(values as never));

        expect(replace).toHaveBeenCalledWith('/campaigns');
    });
});
