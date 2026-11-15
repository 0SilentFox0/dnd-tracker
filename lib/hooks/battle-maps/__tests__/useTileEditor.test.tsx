// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useTileEditor } from '../useTileEditor';

describe('useTileEditor', () => {
    it('tracks dirty chunks and supports undo, redo, and save checkpoints', () => {
        const { result, rerender } = renderHook(
            ({ version }) =>
            useTileEditor({
                initialChunks: {},
                version,
                mapSize: { cols: 16, rows: 16 },
            }),
            { initialProps: { version: 4 } }
        );

        act(() => result.current.onStroke([{ x: 2, y: 3 }]));
        expect(result.current.isDirty).toBe(true);
        expect(result.current.dirtyPatches).toMatchObject([
            { layer: 'ground', cx: 0, cy: 0, data: expect.any(String) },
        ]);

        act(() => result.current.undo());
        expect(result.current.isDirty).toBe(false);
        expect(result.current.canRedo).toBe(true);

        act(() => result.current.redo());
        expect(result.current.isDirty).toBe(true);

        act(() => result.current.acceptSaved());
        rerender({ version: 5 });
        expect(result.current.version).toBe(5);
        expect(result.current.isDirty).toBe(false);
        expect(result.current.canUndo).toBe(false);
    });

    it('keeps layer edits isolated and uses the picker tool', () => {
        const { result } = renderHook(() =>
            useTileEditor({
                initialChunks: {},
                version: 1,
                mapSize: { cols: 8, rows: 8 },
            })
        );

        act(() => result.current.setActiveLayer('objects'));
        expect(result.current.selectedTileId).toBe(5);
        act(() => result.current.onStroke([{ x: 0, y: 0 }]));
        expect(result.current.dirtyPatches[0].layer).toBe('objects');

        act(() => result.current.setTool('picker'));
        act(() => result.current.onStroke([{ x: 0, y: 0 }]));
        expect(result.current.selectedTileId).toBe(5);
        expect(result.current.dirtyPatches).toHaveLength(1);
    });
});
