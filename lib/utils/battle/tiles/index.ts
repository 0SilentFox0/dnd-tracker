export { edgeMask, type EdgeNeighbors } from '@/lib/utils/battle/tiles/autotile';
export {
    type DerivedTileCells,
    deriveTileCells,
    type TileCatalogProperties,
    type TileDefinitionProperties,
    type TileLayerChunks,
    UnknownTileIdError,
} from '@/lib/utils/battle/tiles/derive';
export { diffTileChunks, type TileChunkPatch } from '@/lib/utils/battle/tiles/diff';
export {
    decodeTileChunk,
    encodeTileChunk,
    TileChunkError,
    type TileChunkErrorCode,
} from '@/lib/utils/battle/tiles/rle';
export { isTileLayer, TILE_LAYERS, type TileLayer } from '@/lib/utils/battle/tiles/types';
export { type TileVariant,variantFor } from '@/lib/utils/battle/tiles/variant';
