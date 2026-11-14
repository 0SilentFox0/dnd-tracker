// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useModuleDraft } from '../useModuleDraft';

import '@/components/systems/registry';

describe('useModuleDraft', () => {
    it('starts from the saved composition and edits only the draft', () => {
        const { result } = renderHook(() =>
            useModuleDraft({ key: 'dnd5e', modules: [] })
        );

        expect(result.current.isChanged).toBe(false);

        act(() => result.current.set('morale', true));

        expect(result.current.draft).toEqual({
            key: 'dnd5e',
            modules: ['morale'],
        });
        expect(result.current.preview?.added).toEqual(['morale']);
        expect(result.current.isChanged).toBe(true);

        act(() => result.current.set('morale', false));

        expect(result.current.isChanged).toBe(false);
    });

    it('a module outside the installed composition loads before the preview resolves', async () => {
        vi.resetModules();

        const install = await import('@/components/systems/install');

        const { useModuleDraft: fresh } = await import('../useModuleDraft');

        const current = { key: 'dnd5e', modules: [] };

        await install.loadSystems(current);

        expect(
            install.isSystemReady({ key: 'dnd5e', modules: ['morale'] })
        ).toBe(false);

        const { result } = renderHook(() => fresh(current));

        expect(result.current.preview).not.toBeNull();

        act(() => result.current.set('morale', true));

        expect(result.current.isLoading).toBe(true);
        expect(result.current.isChanged).toBe(true);

        await waitFor(() => expect(result.current.preview).not.toBeNull());

        expect(result.current.preview?.added).toEqual(['morale']);
    });

    it('an uninstalled draft after preload exposes error, retry reloads', async () => {
        vi.resetModules();

        const preload = vi.fn().mockResolvedValue(undefined);

        let installed = false;

        vi.doMock('@/lib/utils/rules/systems/preload', () => ({
            preloadSystem: preload,
        }));
        vi.doMock('@/lib/utils/rules/systems/lookup', async (orig) => ({
            ...(await orig<object>()),
            isInstalled: () => installed,
        }));

        const { useModuleDraft: fresh } = await import('../useModuleDraft');

        const { result } = renderHook(() =>
            fresh({ key: 'dnd5e', modules: [] })
        );

        await waitFor(() => expect(result.current.error).not.toBeNull());

        expect(result.current.isLoading).toBe(false);

        installed = true;
        act(() => result.current.retry());

        await waitFor(() => expect(result.current.error).toBeNull());
        await waitFor(() => expect(preload).toHaveBeenCalledTimes(2));

        expect(result.current.error).toBeNull();

        vi.doUnmock('@/lib/utils/rules/systems/preload');
        vi.doUnmock('@/lib/utils/rules/systems/lookup');
    });
});
