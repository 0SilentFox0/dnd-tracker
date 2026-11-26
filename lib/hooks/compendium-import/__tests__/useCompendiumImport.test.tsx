// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ read: vi.fn() }));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/lib/i18n/use-translator', () => ({
    useTranslator: () => (key: string) => key,
}));
vi.mock('@/lib/utils/compendium-import/file', () => ({
    readCompendiumFile: h.read,
}));
vi.mock('../useCompendiumMedia', () => ({
    useCompendiumMedia: () => ({
        stop: vi.fn(),
        start: vi.fn(),
        resume: vi.fn(),
        retryFailed: vi.fn(),
        running: false,
        paused: false,
        progress: null,
    }),
}));
vi.mock('../useCompendiumRequests', () => ({
    useCompendiumRequests: () => ({
        preview: { isPending: false },
        confirm: { isPending: false },
        openRun: { isPending: false },
        targets: { isError: false },
        targetList: [],
    }),
}));

import { useCompendiumImport } from '../useCompendiumImport';

afterEach(cleanup);

describe('useCompendiumImport close', () => {
    it('clears the failure and the picked file', async () => {
        h.read.mockRejectedValue(new Error('bad json'));

        const { result } = renderHook(() => useCompendiumImport('c'));

        await act(() =>
            result.current.actions.selectFile(new File(['x'], 'a.json'))
        );

        expect(result.current.state.error).not.toBe('');

        act(() => result.current.actions.close());

        expect(result.current.state.error).toBe('');
        expect(result.current.state.file).toBeNull();
    });
});
