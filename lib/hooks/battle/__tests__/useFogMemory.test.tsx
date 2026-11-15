// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useFogMemory } from '../useFogMemory';

afterEach(() => {
    cleanup();
    window.localStorage.clear();
});

describe('useFogMemory', () => {
    it('persists explored cells per battle and viewer and can clear memory', async () => {
        const visible = new Set(['1:2', '2:2']);

        const options = {
            battleId: 'battle-a',
            viewerId: 'player-a',
            size: { cols: 8, rows: 5 },
            visible,
        };

        const first = renderHook(() => useFogMemory(options));

        expect(first.result.current.explored.has('2:2')).toBe(true);
        await waitFor(() =>
            expect(
                window.localStorage.getItem('dnd-tracker:fog:v1:battle-a:player-a')
            ).toContain('"version":1')
        );
        first.unmount();

        const otherViewer = renderHook(() =>
            useFogMemory({ ...options, viewerId: 'player-b', visible: new Set() })
        );

        expect(otherViewer.result.current.explored.size).toBe(0);
        otherViewer.unmount();

        const restored = renderHook(() =>
            useFogMemory({ ...options, visible: new Set() })
        );

        expect(restored.result.current.explored.has('1:2')).toBe(true);
        restored.result.current.setRemember(false);
        await waitFor(() =>
            expect(
                window.localStorage.getItem('dnd-tracker:fog:v1:battle-a:player-a')
            ).toBeNull()
        );
    });
});
