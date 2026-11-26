// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMapArtEditor } from '../useMapArtEditor';

import type { EdgeEditing } from '@/lib/hooks/battle/useEdgeStroke';
import { decodeFloors } from '@/lib/utils/battle/map-art';
import type { MapArtScene } from '@/types/battle-map';

const baseMap = {
    cols: 8,
    rows: 8,
    gridType: 'square' as const,
    walls: ['0:0:e'],
    bars: [],
    doors: { '2:2:s': { locked: true } },
    blocked: [],
};

type TestMap = Parameters<typeof useMapArtEditor>[0]['map'];

const setup = (map: Record<string, unknown> = baseMap) =>
    renderHook(
        ({ m }) => useMapArtEditor({ initial: null, map: m as TestMap }),
        { initialProps: { m: map } }
    );

const sceneOf = (r: { scene: MapArtScene | null }): MapArtScene => {
    if (!r.scene) throw new Error('no scene');

    return r.scene;
};

const edgesOf = (r: { edgeEditing: EdgeEditing | null }): EdgeEditing => {
    if (!r.edgeEditing) throw new Error('no edges');

    return r.edgeEditing;
};

const countFloor = (floors: Record<string, string>) =>
    Object.values(decodeFloors(floors)).reduce(
        (n, c) => n + c.filter(Boolean).length,
        0
    );

describe('useMapArtEditor', () => {
    it('starts from the map walls and doors', () => {
        const { result } = setup();

        expect(result.current.active).toBe(false);
        act(() => result.current.start());
        expect(result.current.active).toBe(true);
        expect(Object.keys(sceneOf(result.current).walls)).toEqual(
            expect.arrayContaining(['0:0:e', '2:2:s'])
        );
        expect(sceneOf(result.current).openings['2:2:s']).toMatchObject({
            kind: 'door',
            locked: true,
        });
        expect(result.current.isDirty).toBe(false);
    });

    it('adds walls, erases wall with its opening, and rejects openings off walls', () => {
        const { result } = setup();

        act(() => result.current.start());
        act(() => result.current.setTool('wall'));
        act(() => edgesOf(result.current).onCommit(['1:1:e'], []));
        expect(sceneOf(result.current).walls['1:1:e']).toBe('stone');

        act(() => result.current.setTool('wall-erase'));
        act(() => edgesOf(result.current).onCommit([], ['2:2:s']));
        expect(sceneOf(result.current).walls['2:2:s']).toBeUndefined();
        expect(sceneOf(result.current).openings['2:2:s']).toBeUndefined();

        const before = result.current.scene;

        act(() => result.current.setTool('opening'));
        act(() => edgesOf(result.current).onCommit(['5:5:e'], []));
        expect(result.current.scene).toBe(before);
        expect(result.current.notice).toEqual({
            message: 'maps.editor.art.notice.openingNeedsWall',
        });

        act(() => edgesOf(result.current).onCommit(['1:1:e'], []));
        expect(sceneOf(result.current).openings['1:1:e']).toMatchObject({
            kind: 'door',
            material: 'wood',
        });
    });

    it('builds a room and supports undo, redo and markSaved', () => {
        const { result } = setup({ ...baseMap, walls: [], doors: {} });

        act(() => result.current.start());
        act(() => result.current.setTool('room'));
        act(() => result.current.onCellStroke([{ x: 2, y: 2 }, { x: 3, y: 3 }]));
        expect(Object.keys(sceneOf(result.current).walls)).toHaveLength(8);
        expect(countFloor(sceneOf(result.current).floors)).toBe(4);
        expect(result.current.isDirty).toBe(true);

        act(() => result.current.undo());
        expect(Object.keys(sceneOf(result.current).walls)).toHaveLength(0);
        expect(result.current.canRedo).toBe(true);

        act(() => result.current.redo());
        expect(Object.keys(sceneOf(result.current).walls)).toHaveLength(8);

        act(() => result.current.markSaved(result.current.scene as MapArtScene));
        expect(result.current.isDirty).toBe(false);
    });

    it('clips walls outside a shrunken map', () => {
        const { result, rerender } = setup({
            ...baseMap,
            walls: ['6:0:e'],
            doors: {},
        });

        act(() => result.current.start());
        expect(sceneOf(result.current).walls['6:0:e']).toBeDefined();
        rerender({ m: { ...baseMap, walls: ['6:0:e'], doors: {}, cols: 4 } });
        expect(sceneOf(result.current).walls['6:0:e']).toBeUndefined();
    });

    it('paints a 7-cell hex brush of size 2', () => {
        const { result } = setup({
            ...baseMap,
            gridType: 'hex',
            walls: [],
            doors: {},
        });

        act(() => result.current.start());
        act(() => result.current.setTool('floor'));
        act(() => result.current.brush.setSize(2));
        act(() => result.current.onCellStroke([{ x: 3, y: 3 }]));
        expect(countFloor(sceneOf(result.current).floors)).toBe(7);
    });
});
