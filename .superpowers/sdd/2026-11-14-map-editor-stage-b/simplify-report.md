# Stage B simplify

Changed:
- MazeWallsLayer: removed duplicate `wallRect`, uses shared `edgeRect` (same geometry, default width).
- edges.ts `edgeBlocks`: single `edgeBlocksPlain` evaluation instead of two.
- useMapTerrainTool: `EdgeBrush` = `EdgeTool` (removed duplicated union).

Left deliberately: comments are mostly one-line "why"; barsLine kept (single user); cache layers in edges.ts (hot path, intentional); useEdgeStroke size acceptable.
