import { TILE_CATALOG, tileAssetPath } from '@/lib/constants/tilesets/catalog';
import type { TileDefinition } from '@/lib/constants/tilesets/types';
import type { OpeningKind } from '@/types/battle-map';

export interface FloorMaterial {
    code: number;
    key: string;
    texture: string;
}

export interface WallMaterial {
    id: string;
    texture: string;
}

export interface OpeningMaterial {
    id: string;
    kind: OpeningKind;
    sprite: string | null;
}

export interface BlockedMaterial {
    id: string;
    sprite: string;
}

const defByKey = (key: string): TileDefinition => {
    const def = TILE_CATALOG.find((tile) => tile.key === key);

    if (!def) throw new Error(`Unknown tile key ${key}`);

    return def;
};

const texture = (key: string): string => tileAssetPath(defByKey(key));

export const FLOOR_MATERIALS: readonly FloorMaterial[] = TILE_CATALOG.filter(
    (tile) => tile.layer === 'ground' || tile.layer === 'wallfill'
).map((tile) => ({
    code: tile.id,
    key: tile.key,
    texture: tileAssetPath(tile),
}));

export const WALL_MATERIALS: readonly WallMaterial[] = [
    ['stone', 'stone-wall-fill'],
    ['brick', 'wall-brick'],
    ['cave', 'wall-cave'],
    ['hedge', 'wall-hedge'],
    ['ice', 'wall-ice'],
    ['wood', 'wall-wood'],
].map(([id, key]) => ({ id, texture: texture(key) }));

export const OPENING_MATERIALS: readonly OpeningMaterial[] = [
    { id: 'wood', kind: 'door', sprite: null },
    { id: 'iron', kind: 'door', sprite: null },
    { id: 'window', kind: 'window', sprite: texture('window') },
    { id: 'bars-iron', kind: 'bars', sprite: texture('bars-iron') },
    { id: 'portcullis', kind: 'portcullis', sprite: texture('portcullis') },
];

export const BLOCKED_MATERIALS: readonly BlockedMaterial[] = [
    ['rubble', 'rubble-pile'],
    ['boulder', 'boulder'],
    ['rock', 'rock-small'],
].map(([id, key]) => ({ id, sprite: texture(key) }));

export const DEFAULT_ART = {
    wall: 'stone',
    door: 'wood',
    bars: 'bars-iron',
    floor: defByKey('stone-floor').id,
} as const;

const floorByCode = new Map(FLOOR_MATERIALS.map((m) => [m.code, m]));

export const floorMaterial = (code: number): FloorMaterial | undefined =>
    floorByCode.get(code);

export const isFloorCode = (code: number): boolean => floorByCode.has(code);
