export const TILE_LAYER_IDS = {
    ground: 1,
    wallfill: 2,
    objects: 3,
    'edge-art': 4,
} as const;

export type TileLayer = keyof typeof TILE_LAYER_IDS;

export const TILE_LAYERS = Object.keys(TILE_LAYER_IDS) as TileLayer[];

export function tileLayerFromId(layerId: number): TileLayer | null {
    return (
        (Object.entries(TILE_LAYER_IDS).find(([, id]) => id === layerId)?.[
            0
        ] as TileLayer | undefined) ?? null
    );
}
