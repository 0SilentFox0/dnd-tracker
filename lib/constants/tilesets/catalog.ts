import type { MapSpellEffect, TileDefinition } from './types';

import type { TileLayer } from '@/lib/utils/battle/tiles/types';

type Footprint = TileDefinition['footprint'];

interface Seed {
    key: string;
    layer: TileLayer;
    footprint?: Footprint;
    passable?: boolean;
    nameKey?: string;
    assetFile?: string;
    effectKind?: MapSpellEffect;
}

const ONE: Footprint = { cols: 1, rows: 1 };

const WIDE: Footprint = { cols: 2, rows: 1 };

const BIG: Footprint = { cols: 2, rows: 2 };

const NAME_PREFIX = 'maps.editor.tiles.name.';

const GROUND_FAMILIES: readonly (readonly [string, number?])[] = [
    ['acid-pool'],
    ['bone-ash'],
    ['brick-floor'],
    ['carpet-red'],
    ['cave-floor'],
    ['checker-tile'],
    ['cobblestone'],
    ['cracked-flagstone'],
    ['dirt-path'],
    ['dirt'],
    ['farmland'],
    ['forest-floor'],
    ['grass', 2],
    ['gravel'],
    ['ice'],
    ['lava'],
    ['magic-glyphs'],
    ['marble-tile'],
    ['mossy-stone'],
    ['mud'],
    ['rubble'],
    ['sand'],
    ['snow'],
    ['stone-floor', 2],
    ['swamp'],
    ['tall-grass'],
    ['water-deep'],
    ['water-shallow'],
    ['wood-planks-light'],
    ['wood-planks', 2],
];

const LEGACY_GROUND: Seed[] = [
    ['stone-floor', 'stoneFloor'],
    ['grass', 'grass'],
    ['wood-planks', 'woodPlanks'],
].map(([key, name]) => ({
    key,
    layer: 'ground',
    nameKey: `battle.tiles.${name}`,
    assetFile: `tiles_${key}_1.png`,
}));

const groundSeeds = (): Seed[] =>
    GROUND_FAMILIES.flatMap(([base, from = 1]) =>
        [1, 2, 3]
            .filter((n) => n >= from)
            .map((n) => ({
                key: `${base}-${n}`,
                layer: 'ground' as const,
            }))
    );

const WALL_FILLS = ['brick', 'cave', 'hedge', 'ice', 'wood'];

const OBJECTS: readonly (readonly [string, Footprint?, boolean?])[] = [
    ['altar'],
    ['anvil'],
    ['bed', WIDE],
    ['blood-stain', ONE, true],
    ['bones', ONE, true],
    ['bookshelf'],
    ['boulder'],
    ['brazier'],
    ['bush'],
    ['campfire'],
    ['cart', WIDE],
    ['cauldron'],
    ['chair'],
    ['chest-closed'],
    ['chest-open'],
    ['cobweb', ONE, true],
    ['crate'],
    ['fountain', BIG],
    ['grave'],
    ['pillar'],
    ['rock-small'],
    ['rubble-pile'],
    ['stairs-down', ONE, true],
    ['stairs-up', ONE, true],
    ['statue'],
    ['stool'],
    ['table-long', WIDE],
    ['table-round'],
    ['tent', BIG],
    ['trapdoor'],
    ['treasure-pile'],
    ['tree-oak', BIG],
    ['tree-pine', BIG],
    ['well'],
];

const EDGE_ART = [
    'bars-iron',
    'door-iron-closed',
    'door-iron-open',
    'door-wood-open',
    'portcullis',
    'window',
];

const EFFECTS: readonly (readonly [string, MapSpellEffect])[] = [
    ['smoke', 'curse'],
    ['flame', 'fire'],
    ['glow', 'holy'],
    ['frost', 'frost'],
    ['plague', 'plague'],
    ['blood', 'blood'],
    ['stun', 'stun'],
    ['nature', 'nature'],
    ['storm', 'storm'],
    ['gold', 'gold'],
    ['life', 'life'],
];

const SEEDS: Seed[] = [
    ...LEGACY_GROUND,
    {
        key: 'stone-wall-fill',
        layer: 'wallfill',
        nameKey: 'battle.tiles.stoneWall',
        assetFile: 'tiles_wall-stone.png',
    },
    {
        key: 'barrel',
        layer: 'objects',
        nameKey: 'battle.tiles.barrel',
        assetFile: 'tiles_barrel.png',
    },
    {
        key: 'closed-wood-door',
        layer: 'edge-art',
        nameKey: 'battle.tiles.closedWoodDoor',
        assetFile: 'tiles_door-wood-closed-cell.png',
    },
    ...groundSeeds(),
    ...WALL_FILLS.map((name) => ({
        key: `wall-${name}`,
        layer: 'wallfill' as const,
    })),
    ...OBJECTS.map(([key, footprint, passable]) => ({
        key,
        layer: 'objects' as const,
        footprint,
        passable,
    })),
    ...EDGE_ART.map((key) => ({
        key,
        layer: 'edge-art' as const,
        ...(key === 'door-wood-open' && {
            assetFile: 'tiles_door-wood-open-cell.png',
        }),
    })),
    ...EFFECTS.map(([name, effectKind]) => ({
        key: `${name}-effect`,
        layer: 'effects' as const,
        effectKind,
    })),
];

const assetOf = (key: string, layer: TileLayer): string =>
    `tiles_${layer === 'ground' ? key.replace(/-(\d+)$/, '_$1') : key}.png`;

function toDefinition(seed: Seed, index: number): TileDefinition {
    const { key, layer, effectKind } = seed;

    const solid = layer === 'objects' && !seed.passable;

    return {
        id: index + 1,
        key,
        nameKey: seed.nameKey ?? `${NAME_PREFIX}${key}`,
        layer,
        assetFile:
            layer === 'effects'
                ? null
                : (seed.assetFile ?? assetOf(key, layer)),
        source: 'generated',
        license:
            layer === 'effects'
                ? 'Procedural CSS spell effect'
                : 'Proprietary generated asset',
        footprint: seed.footprint ?? ONE,
        autotile: layer === 'ground' ? 'ground-16' : 'none',
        blocks: solid,
        blocksSight: solid,
        ...(effectKind && { effectKind }),
    };
}

export const TILE_CATALOG: readonly TileDefinition[] = SEEDS.map(toDefinition);

const byId = new Map<number, TileDefinition>(
    TILE_CATALOG.map((tile) => [tile.id, tile])
);

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
