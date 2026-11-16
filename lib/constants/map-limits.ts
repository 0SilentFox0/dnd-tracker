export const BATTLE_MAP_BACKGROUND_FORMATS = {
    'image/png': 'png',
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
} as const;

export const BATTLE_MAP_BACKGROUND_TYPES = Object.keys(
    BATTLE_MAP_BACKGROUND_FORMATS
) as (keyof typeof BATTLE_MAP_BACKGROUND_FORMATS)[];

export const MAP_LIMITS = {
    backgroundUploadBytes: 8 * 1024 * 1024,
    minSide: 4,
    photoMaxSide: 60,
    tileMaxSide: 200,
    inlineMaxEdges: 7200,
    libraryMaxEdges: 80000,
    chunk: 16,
    maxTerrainCells: 3600,
    dmMoveCap: 60,
    doorsMax: 500,
    // temporary until battle stages C/D allow larger maps on the board
    battleMaxSide: 60,
} as const;
