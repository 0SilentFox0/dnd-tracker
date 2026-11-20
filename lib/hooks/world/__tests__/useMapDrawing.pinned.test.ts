// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MODE_TOOLS, useMapDrawing } from '../useMapDrawing';

afterEach(cleanup);

const actions = () => ({
    onPoint: vi.fn(),
    onZone: vi.fn(),
    onEntry: vi.fn(),
});

const key = (k: string) =>
    act(
        () =>
            void document.body.dispatchEvent(
                new KeyboardEvent('keydown', { key: k, bubbles: true })
            )
    );

describe('useMapDrawing pinned tool', () => {
    it('an unpinned tool returns to select after placing a point', () => {
        const { result } = renderHook(() => useMapDrawing(actions()));

        act(() => result.current.setTool('point'));
        act(() => result.current.handlers.onMapClick({ x: 0.1, y: 0.1 }));

        expect(result.current.tool).toBe('select');
    });

    it('a zone returns to select after finishing unless pinned', () => {
        const triangle = [
            { x: 0.1, y: 0.1 },
            { x: 0.5, y: 0.1 },
            { x: 0.3, y: 0.5 },
        ];

        const draw = (pin: boolean) => {
            const a = actions();

            const { result } = renderHook(() => useMapDrawing(a));

            act(() => result.current.setTool('zone', pin));
            triangle.forEach((p) =>
                act(() => result.current.handlers.onMapClick(p))
            );
            act(() => result.current.finish());

            return { tool: result.current.tool, a };
        };

        const free = draw(false);

        expect(free.a.onZone).toHaveBeenCalledTimes(1);
        expect(free.tool).toBe('select');
        expect(draw(true).tool).toBe('zone');
    });

    it('a pinned tool stays; choosing another tool unpins', () => {
        const { result } = renderHook(() => useMapDrawing(actions()));

        act(() => result.current.setTool('point', true));
        act(() => result.current.handlers.onMapClick({ x: 0.1, y: 0.1 }));

        expect(result.current.tool).toBe('point');

        act(() => result.current.setTool('zone'));

        expect(result.current.pinned.value).toBe(false);
    });

    it('Esc goes one step at a time: draft first, then the pinned tool', () => {
        const { result } = renderHook(() => useMapDrawing(actions()));

        act(() => result.current.setTool('zone', true));
        act(() => result.current.handlers.onMapClick({ x: 0.1, y: 0.1 }));
        key('Escape');

        expect(result.current.draft).toEqual([]);
        expect(result.current.tool).toBe('zone');

        key('Escape');

        expect(result.current.tool).toBe('select');
        expect(result.current.pinned.value).toBe(false);
    });

    it('play mode allows only the move hotkey and Esc keeps it', () => {
        const { result } = renderHook(() =>
            useMapDrawing(actions(), true, MODE_TOOLS.play)
        );

        key('p');
        act(() => result.current.setTool('move'));
        key('Escape');

        expect(result.current.tool).toBe('move');
    });
});
