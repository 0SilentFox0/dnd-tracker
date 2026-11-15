import type { TileDefinition } from '@/lib/constants/tilesets/types';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';

export const TILE_CATALOG = [
    {
        id: 1,
        key: 'stone-floor',
        nameKey: 'battle.tiles.stoneFloor',
        layer: 'ground',
        assetFile: 'tiles_stone-floor_1.png',
        source: 'generated',
        license: 'Proprietary generated asset',
        footprint: { cols: 1, rows: 1 },
        autotile: 'ground-16',
        blocks: false,
        blocksSight: false,
    },
    {
        id: 2,
        key: 'grass',
        nameKey: 'battle.tiles.grass',
        layer: 'ground',
        assetFile: 'tiles_grass_1.png',
        source: 'generated',
        license: 'Proprietary generated asset',
        footprint: { cols: 1, rows: 1 },
        autotile: 'ground-16',
        blocks: false,
        blocksSight: false,
    },
    {
        id: 3,
        key: 'wood-planks',
        nameKey: 'battle.tiles.woodPlanks',
        layer: 'ground',
        assetFile: 'tiles_wood-planks_1.png',
        source: 'generated',
        license: 'Proprietary generated asset',
        footprint: { cols: 1, rows: 1 },
        autotile: 'ground-16',
        blocks: false,
        blocksSight: false,
    },
    {
        id: 4,
        key: 'stone-wall-fill',
        nameKey: 'battle.tiles.stoneWall',
        layer: 'wallfill',
        assetFile: 'tiles_wall-stone.png',
        source: 'generated',
        license: 'Proprietary generated asset',
        footprint: { cols: 1, rows: 1 },
        autotile: 'none',
        blocks: false,
        blocksSight: false,
    },
    {
        id: 5,
        key: 'barrel',
        nameKey: 'battle.tiles.barrel',
        layer: 'objects',
        assetFile: 'tiles_barrel.png',
        source: 'generated',
        license: 'Proprietary generated asset',
        footprint: { cols: 1, rows: 1 },
        autotile: 'none',
        blocks: true,
        blocksSight: true,
    },
    {
        id: 6,
        key: 'closed-wood-door',
        nameKey: 'battle.tiles.closedWoodDoor',
        layer: 'edge-art',
        assetFile: 'tiles_door-wood-closed.png',
        source: 'generated',
        license: 'Proprietary generated asset',
        footprint: { cols: 1, rows: 1 },
        autotile: 'none',
        blocks: false,
        blocksSight: false,
    },
] as const satisfies readonly TileDefinition[];

const byId = new Map(TILE_CATALOG.map((tile) => [tile.id, tile]));

export function tileDefinition(id: number): TileDefinition | undefined {
    return byId.get(id);
}

export function validateTileIdsForLayer(
    ids: Uint16Array,
    layer: TileLayer
): void {
    for (const id of ids) {
        if (id === 0) continue;

        const tile = tileDefinition(id);

        if (!tile || tile.layer !== layer)
            throw new Error(`Tile id ${id} is not valid in layer ${layer}`);
    }
}
