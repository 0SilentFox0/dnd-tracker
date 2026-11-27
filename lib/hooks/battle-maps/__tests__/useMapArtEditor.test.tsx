// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMapArtEditor } from '../useMapArtEditor';

import { stampDef } from '@/lib/constants/map-art/stamps';
import type { EdgeEditing } from '@/lib/hooks/battle/useEdgeStroke';
import { mapArtSceneSchema } from '@/lib/schemas/map-art';
import { cellAtUnitPoint, cellCenter, gridMetrics } from '@/lib/utils/battle/grid/layout';
import { decodeFloors, stampCells } from '@/lib/utils/battle/map-art';
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

    it('floor erase also removes a scene-blocked cell', () => {
        const { result } = setup();

        act(() => result.current.start());
        act(() => result.current.setTool('blocked'));
        act(() => result.current.onCellStroke([{ x: 4, y: 4 }]));
        expect(Object.keys(sceneOf(result.current).blocked)).toEqual(['4:4']);

        act(() => result.current.setTool('floor-erase'));
        act(() => result.current.onCellStroke([{ x: 4, y: 4 }]));
        expect(sceneOf(result.current).blocked).toEqual({});
    });

    it('coalesces consecutive moves of one light into a single undo step', () => {
        const { result } = setup();

        act(() => result.current.start());
        act(() => result.current.setTool('light'));
        act(() => result.current.onCellStroke([{ x: 1, y: 1 }]));

        const id = sceneOf(result.current).lights[0].id;

        act(() => result.current.lights.move(id, { x: 10, y: 10 }));
        act(() => result.current.lights.move(id, { x: 20, y: 20 }));
        act(() => result.current.lights.move(id, { x: 30, y: 30 }));

        expect(sceneOf(result.current).lights[0]).toMatchObject({ x: 30, y: 30 });

        act(() => result.current.undo());

        const back = sceneOf(result.current).lights[0];

        expect(back.x).not.toBe(30);
        expect(back.x).not.toBe(10);

        act(() => result.current.lights.move(id, { x: 5, y: 5 }));
        act(() => result.current.lights.update(id, { intensity: 0.5 }));
        act(() => result.current.lights.move(id, { x: 6, y: 6 }));
        act(() => result.current.undo());
        expect(sceneOf(result.current).lights[0]).toMatchObject({ x: 5, intensity: 0.5 });
    });

    describe('stamps', () => {
        const stampsOf = (r: { scene: MapArtScene | null }) => sceneOf(r).stamps;

        const started = () => {
            const hook = setup();

            act(() => hook.result.current.start());
            act(() => hook.result.current.stamps.setAsset('altar'));

            return hook;
        };

        it('places on the cell centre with snap and at the exact point without', () => {
            const { result } = started();

            act(() => result.current.stamps.place({ x: 130, y: 270 }));
            expect(stampsOf(result.current)[0]).toMatchObject({
                asset: 'altar',
                x: 150,
                y: 250,
                z: 0,
                scale: 1,
            });
            expect(result.current.stamps.selectedId).toBeNull();

            act(() => result.current.stamps.setSnap(false));
            act(() => result.current.stamps.place({ x: 130, y: 270 }));
            expect(stampsOf(result.current)[1]).toMatchObject({ x: 130, y: 270, z: 1 });
            expect(stampsOf(result.current)[1].id.length).toBeLessThanOrEqual(40);
        });

        it('applies the ghost rotation and flip to new stamps', () => {
            const { result } = started();

            act(() => result.current.stamps.rotateGhost(1));
            act(() => result.current.stamps.flipGhost());
            act(() => result.current.stamps.place({ x: 50, y: 50 }));
            expect(stampsOf(result.current)[0]).toMatchObject({ rot: 15, flip: true });
        });

        it('normalises rotation, clamps scale and position', () => {
            const { result } = started();

            act(() => result.current.stamps.place({ x: 50, y: 50 }));

            const { id } = stampsOf(result.current)[0];

            act(() =>
                result.current.stamps.update(id, { rot: 370, scale: 9, x: 5000, y: -4 })
            );
            expect(stampsOf(result.current)[0]).toMatchObject({
                rot: 10,
                scale: 4,
                x: 800,
                y: 0,
            });
            act(() => result.current.stamps.update(id, { rot: -30 }));
            expect(stampsOf(result.current)[0].rot).toBe(330);
        });

        it('coalesces moves with one key into a single undo step', () => {
            const { result } = started();

            act(() => result.current.stamps.place({ x: 50, y: 50 }));

            const { id } = stampsOf(result.current)[0];

            const key = `stamp-move:${id}`;

            act(() => result.current.stamps.update(id, { x: 100 }, key));
            act(() => result.current.stamps.update(id, { x: 200 }, key));
            expect(stampsOf(result.current)[0].x).toBe(200);
            act(() => result.current.undo());
            expect(stampsOf(result.current)[0].x).toBe(50);
            act(() => result.current.redo());
            expect(stampsOf(result.current)[0].x).toBe(200);
        });

        it('duplicates with an offset and selects the copy, removes and reorders', () => {
            const { result } = started();

            act(() => result.current.stamps.place({ x: 150, y: 150 }));

            const src = stampsOf(result.current)[0];

            act(() => result.current.stamps.duplicate(src.id));

            const copy = stampsOf(result.current)[1];

            expect(copy.id).not.toBe(src.id);
            expect(copy).toMatchObject({ asset: 'altar', x: src.x + 50, y: src.y + 50, z: 1 });
            expect(result.current.stamps.selectedId).toBe(copy.id);

            act(() => result.current.stamps.reorder(copy.id, -1));
            act(() => result.current.stamps.reorder(copy.id, -1));
            expect(stampsOf(result.current)[1].z).toBe(-1);

            act(() => result.current.stamps.remove(copy.id));
            expect(stampsOf(result.current)).toHaveLength(1);
            expect(result.current.stamps.selectedId).toBeNull();
        });

        it('snaps a 2x2 stamp to a cell corner so it blocks four cells', () => {
            const { result } = setup();

            act(() => result.current.start());
            act(() => result.current.stamps.setAsset('tree-oak'));
            act(() => result.current.stamps.place({ x: 330, y: 340 }));

            const placed = stampsOf(result.current)[0];

            expect(placed).toMatchObject({ x: 300, y: 300 });
            expect(
                [...stampCells([placed], { cols: 8, rows: 8, gridType: 'square' }).blocked].sort()
            ).toEqual(['2:2', '2:3', '3:2', '3:3']);
        });

        it('snaps a 2x2 stamp on hex to a cell centre offset by half a step', () => {
            const { result } = setup({ ...baseMap, gridType: 'hex', walls: [], doors: {} });

            act(() => result.current.start());
            act(() => result.current.stamps.setAsset('tree-oak'));
            act(() => result.current.stamps.place({ x: 200, y: 200 }));

            const { colStep, rowStep } = gridMetrics('hex');

            const c = cellCenter(cellAtUnitPoint({ x: 200, y: 200 }, 'hex'), 'hex');

            expect(stampsOf(result.current)[0]).toMatchObject({
                x: c.x + colStep / 2,
                y: c.y + rowStep / 2,
            });
        });

        it('rotating the ghost by 90 swaps the snapped footprint axes', () => {
            const { result } = setup();

            act(() => result.current.start());
            act(() => result.current.stamps.setAsset('bed'));

            const def = stampDef('bed');

            expect(def && def.cols !== def.rows).toBe(true);
            for (let i = 0; i < 6; i++) act(() => result.current.stamps.rotateGhost(1));
            act(() => result.current.stamps.place({ x: 330, y: 340 }));

            const p = stampsOf(result.current)[0];

            const evenCols = (def?.cols ?? 1) % 2 === 0;

            expect(p.x % 100 === 0).toBe(!evenCols);
            expect(p.y % 100 === 0).toBe(evenCols);
        });

        it('renumbers z instead of growing past the schema bound', () => {
            const { result } = started();

            act(() => result.current.stamps.setSnap(false));

            const seed = Array.from({ length: 3 }, (_, i) => ({
                id: `s${i}`,
                asset: 'altar',
                x: 10 + i,
                y: 10,
                rot: 0,
                scale: 1,
                flip: false,
                z: 998 + i,
            }));

            act(() =>
                result.current.reset({
                    scene: { ...sceneOf(result.current), stamps: seed },
                    sceneVersion: 0,
                    bakedSceneVersion: null,
                    bakedUrl: null,
                    bakedAt: null,
                })
            );
            act(() => result.current.stamps.place({ x: 50, y: 50 }));
            act(() => result.current.stamps.reorder('s2', 1));
            act(() => result.current.stamps.reorder('s2', 1));

            const zs = stampsOf(result.current).map((s) => s.z);

            expect(Math.max(...zs.map(Math.abs))).toBeLessThanOrEqual(1000);
            expect(mapArtSceneSchema.safeParse(sceneOf(result.current)).success).toBe(true);
            expect(stampsOf(result.current).map((s) => s.id)).toContain('s2');

            const byZ = [...stampsOf(result.current)].sort((a, b) => a.z - b.z).map((s) => s.id);

            expect(byZ.slice(0, 2)).toEqual(['s0', 's1']);
        });

        it('drops stamps of unknown assets on reset and on the initial scene, with a notice', () => {
            const known = {
                id: 'k',
                asset: 'altar',
                x: 10,
                y: 10,
                rot: 0,
                scale: 1,
                flip: false,
                z: 0,
            };

            const ghosts = [known, { ...known, id: 'u', asset: 'removed-asset' }];

            const { result } = setup();

            act(() => result.current.start());
            act(() =>
                result.current.reset({
                    scene: { ...sceneOf(result.current), stamps: ghosts },
                    sceneVersion: 0,
                    bakedSceneVersion: null,
                    bakedUrl: null,
                    bakedAt: null,
                })
            );
            expect(stampsOf(result.current).map((s) => s.id)).toEqual(['k']);
            expect(result.current.notice).toMatchObject({
                message: 'maps.editor.art.notice.unknownStamps',
                params: { count: 1 },
            });
            expect(result.current.isDirty).toBe(true);

            const seeded = renderHook(() =>
                useMapArtEditor({
                    initial: { ...sceneOf(result.current), stamps: ghosts },
                    map: baseMap as unknown as TestMap,
                })
            );

            expect(stampsOf(seeded.result.current).map((s) => s.id)).toEqual(['k']);
            expect(seeded.result.current.notice).not.toBeNull();
        });

        it('stops at the 2000 limit with a notice', () => {
            const { result } = started();

            const full = Array.from({ length: 2000 }, (_, i) => ({
                id: `s${i}`,
                asset: 'altar',
                x: 10,
                y: 10,
                rot: 0,
                scale: 1,
                flip: false,
                z: i,
            }));

            act(() =>
                result.current.reset({
                    scene: { ...sceneOf(result.current), stamps: full },
                    sceneVersion: 0,
                    bakedSceneVersion: null,
                    bakedUrl: null,
                    bakedAt: null,
                })
            );
            act(() => result.current.stamps.place({ x: 50, y: 50 }));
            expect(stampsOf(result.current)).toHaveLength(2000);
            expect(result.current.notice).toMatchObject({ message: 'maps.editor.stamps.limit' });

            act(() => result.current.clearNotice());
            act(() => result.current.stamps.duplicate('s0'));
            expect(stampsOf(result.current)).toHaveLength(2000);
            expect(result.current.notice).toMatchObject({ message: 'maps.editor.stamps.limit' });
        });
    });
});
