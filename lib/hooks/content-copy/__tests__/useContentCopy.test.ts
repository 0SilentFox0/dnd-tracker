// @vitest-environment happy-dom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { contentCopyApi } from '@/lib/api/content-copy';
import { useContentCopy, useContentCopyOptions } from '@/lib/hooks/content-copy';

vi.mock('@/lib/api/content-copy', () => ({
    contentCopyApi: { options: vi.fn(), copy: vi.fn() },
}));

const body = {
    items: [{ kind: 'units' as const, ids: ['a'] }],
    targets: { campaignIds: ['c2'] },
};

const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
        QueryClientProvider,
        { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        children
    );

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('useContentCopy', () => {
    it('preview sends dryRun true', async () => {
        vi.mocked(contentCopyApi.copy).mockResolvedValue({ targets: [] });

        const { result } = renderHook(() => useContentCopy('c1'), { wrapper });

        await act(() => result.current.preview.mutateAsync(body));

        expect(contentCopyApi.copy).toHaveBeenCalledWith('c1', {
            ...body,
            dryRun: true,
        });
    });

    it('run sends dryRun false', async () => {
        vi.mocked(contentCopyApi.copy).mockResolvedValue({ targets: [] });

        const { result } = renderHook(() => useContentCopy('c1'), { wrapper });

        await act(() => result.current.run.mutateAsync(body));

        expect(contentCopyApi.copy).toHaveBeenCalledWith('c1', {
            ...body,
            dryRun: false,
        });
    });

    it('continues through next until the server is done', async () => {
        const report = (campaignId: string) => ({
            campaignId,
            name: campaignId,
            status: 'ok' as const,
            created: [],
            reused: [],
            skipped: [],
            warnings: [],
        });

        vi.mocked(contentCopyApi.copy)
            .mockResolvedValueOnce({ targets: [report('a')], next: 'a' })
            .mockResolvedValueOnce({ targets: [report('b')] });

        const { result } = renderHook(() => useContentCopy('c1'), { wrapper });

        const out = await act(() =>
            result.current.run.mutateAsync({ ...body, targets: { all: true } })
        );

        expect(contentCopyApi.copy).toHaveBeenCalledTimes(2);
        expect(vi.mocked(contentCopyApi.copy).mock.calls[1][1].after).toBe('a');
        expect(out?.targets.map((t) => t.campaignId)).toEqual(['a', 'b']);
    });

    it('invalidates cached queries of targets that received content', async () => {
        const client = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });

        client.setQueryData(['spells', 'c2'], [1]);
        client.setQueryData(['spells', 'c3'], [1]);
        client.setQueryData(['spells', 'c1'], [1]);
        vi.mocked(contentCopyApi.copy).mockResolvedValue({
            targets: [
                { campaignId: 'c2', created: [{ kind: 'spells', name: 'a' }] },
                { campaignId: 'c3', created: [] },
            ],
        } as never);

        const { result } = renderHook(() => useContentCopy('c1'), {
            wrapper: ({ children }: { children: ReactNode }) =>
                createElement(QueryClientProvider, { client }, children),
        });

        await act(() => result.current.run.mutateAsync(body));

        expect(client.getQueryState(['spells', 'c2'])?.isInvalidated).toBe(true);
        expect(client.getQueryState(['spells', 'c3'])?.isInvalidated).toBe(false);
        expect(client.getQueryState(['spells', 'c1'])?.isInvalidated).toBe(false);
    });

    it('propagates API errors', async () => {
        vi.mocked(contentCopyApi.copy).mockRejectedValue(new Error('boom'));

        const { result } = renderHook(() => useContentCopy('c1'), { wrapper });

        await expect(
            act(() => result.current.preview.mutateAsync(body))
        ).rejects.toThrow('boom');
    });
});

describe('useContentCopyOptions', () => {
    it('does not fetch when disabled, fetches when enabled', async () => {
        vi.mocked(contentCopyApi.options).mockResolvedValue({
            items: [],
            campaigns: [],
        });

        renderHook(() => useContentCopyOptions('c1', 'units', false), {
            wrapper,
        });

        expect(contentCopyApi.options).not.toHaveBeenCalled();

        renderHook(() => useContentCopyOptions('c1', 'units', true), {
            wrapper,
        });

        await waitFor(() =>
            expect(contentCopyApi.options).toHaveBeenCalledWith('c1', 'units')
        );
    });
});
