export const MAP_LIMITS = {
    minSide: 4,
    photoMaxSide: 60,
    tileMaxSide: 200,
    inlineMaxEdges: 7200,
    libraryMaxEdges: 80000,
    chunk: 16,
    maxTerrainCells: 3600,
    doorsMax: 500,
    // temporary until battle stages C/D allow larger maps on the board
    battleMaxSide: 60,
} as const;
