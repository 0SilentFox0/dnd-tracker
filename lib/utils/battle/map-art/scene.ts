import { DEFAULT_ART } from '@/lib/constants/map-art/materials';
import { edgeCellsOf, edgeOnGrid } from '@/lib/utils/battle/grid/edge-keys';
import { gridOf, parseCellKey } from '@/lib/utils/battle/grid/geometry';
import { mapSize } from '@/lib/utils/battle/grid/layout';
import { decodeFloors, encodeFloors } from '@/lib/utils/battle/map-art/floors';
import { CHUNK_SIDE } from '@/lib/utils/battle/map-storage/chunk-key';
import type { BattleMapConfig, GridKind } from '@/types/battle-grid';
import type { MapArtScene } from '@/types/battle-map';

export type MapDims = Pick<BattleMapConfig, 'cols' | 'rows' | 'gridType'>;

export function emptyScene(): MapArtScene {
    return {
        v: 1,
        floors: {},
        walls: {},
        openings: {},
        blocked: {},
        lights: [],
        ambient: { tint: '#000000', darkness: 0 },
        stamps: [],
    };
}

export function sceneFromMap(
    map: Pick<BattleMapConfig, 'walls' | 'bars' | 'doors' | 'blocked'>
): MapArtScene {
    const scene = emptyScene();

    for (const k of map.walls ?? []) scene.walls[k] = DEFAULT_ART.wall;

    for (const k of map.bars ?? []) {
        scene.walls[k] = DEFAULT_ART.wall;
        scene.openings[k] = { kind: 'bars', material: DEFAULT_ART.bars };
    }

    for (const [k, door] of Object.entries(map.doors ?? {})) {
        scene.walls[k] = DEFAULT_ART.wall;
        scene.openings[k] = {
            kind: 'door',
            material: DEFAULT_ART.door,
            ...(door.locked && { locked: true }),
            ...(door.open && { open: true }),
        };
    }

    for (const k of map.blocked ?? []) scene.blocked[k] = null;

    return scene;
}

function edgeInside(grid: GridKind, key: string, map: MapDims): boolean {
    if (!edgeOnGrid(grid, key)) return false;

    return edgeCellsOf(grid, key).every(
        (c) => c.x >= 0 && c.y >= 0 && c.x < map.cols && c.y < map.rows
    );
}

function pick<T>(
    rec: Record<string, T>,
    keep: (key: string) => boolean
): Record<string, T> {
    const entries = Object.entries(rec);

    const kept = entries.filter(([k]) => keep(k));

    return kept.length === entries.length ? rec : Object.fromEntries(kept);
}

export function clipScene(scene: MapArtScene, map: MapDims): MapArtScene {
    const grid = gridOf(map);

    const walls = pick(scene.walls, (k) => edgeInside(grid, k, map));

    const openings = pick(
        scene.openings,
        (k) => k in walls && edgeInside(grid, k, map)
    );

    const blocked = pick(scene.blocked, (k) => {
        const c = parseCellKey(k);

        return c.x >= 0 && c.y >= 0 && c.x < map.cols && c.y < map.rows;
    });

    const chunks = decodeFloors(scene.floors);

    let floorsChanged = false;

    for (const [key, cells] of Object.entries(chunks)) {
        const [cx, cy] = key.split(':').map(Number);

        let touched = false;

        for (let i = 0; i < cells.length; i++) {
            if (!cells[i]) continue;

            const x = cx * CHUNK_SIDE + (i % CHUNK_SIDE);

            const y = cy * CHUNK_SIDE + Math.floor(i / CHUNK_SIDE);

            if (x >= map.cols || y >= map.rows) {
                cells[i] = 0;
                touched = true;
            }
        }

        floorsChanged ||= touched;
    }

    const size = mapSize(map, grid);

    const lights = scene.lights.filter(
        (l) => l.x >= 0 && l.y >= 0 && l.x <= size.width && l.y <= size.height
    );

    if (
        walls === scene.walls &&
        openings === scene.openings &&
        blocked === scene.blocked &&
        !floorsChanged &&
        lights.length === scene.lights.length
    )
        return scene;

    return {
        ...scene,
        floors: floorsChanged ? encodeFloors(chunks) : scene.floors,
        walls,
        openings,
        blocked,
        lights,
    };
}
