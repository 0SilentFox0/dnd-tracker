// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BattleMapEditor } from '@/lib/hooks/battles/setup/useBattleMapEditor';
import { useBattleMapSections } from '@/lib/hooks/battles/setup/useBattleMapSections';
import type { SetupTool } from '@/lib/utils/battle/grid/map-editor';

const editorWith = (tool: SetupTool | null) => {
    const setTool = vi.fn();

    return {
        editor: {
            state: { tool },
            actions: { setTool },
        } as unknown as BattleMapEditor,
        setTool,
    };
};

const flags = { touch: false, hasModes: true, hidesTerrain: false };

describe('useBattleMapSections', () => {
    it('clears the tool when switching to another section', () => {
        const { editor, setTool } = editorWith('wall');

        const { result } = renderHook(() =>
            useBattleMapSections(editor, flags)
        );

        act(() => result.current.select('edges'));

        expect(setTool).toHaveBeenCalledWith(null);
        expect(result.current.active).toBe('edges');
    });

    it('keeps the tool when selecting its own section', () => {
        const { editor, setTool } = editorWith('wall');

        const { result } = renderHook(() =>
            useBattleMapSections(editor, flags)
        );

        act(() => result.current.select('cells'));

        expect(setTool).not.toHaveBeenCalled();
    });

    it('clears the tool when the active section becomes disabled', () => {
        const { editor, setTool } = editorWith('wall');

        const { result, rerender } = renderHook(
            (f) => useBattleMapSections(editor, f),
            { initialProps: flags }
        );

        act(() => result.current.select('cells'));
        rerender({ ...flags, hidesTerrain: true });

        expect(setTool).toHaveBeenCalledWith(null);
    });

    it('falls back to grid when the active section becomes hidden', () => {
        const { editor } = editorWith(null);

        const { result, rerender } = renderHook(
            (f) => useBattleMapSections(editor, f),
            { initialProps: flags }
        );

        act(() => result.current.select('mode'));
        expect(result.current.active).toBe('mode');

        rerender({ ...flags, hasModes: false });

        expect(result.current.active).toBe('grid');
    });
});
