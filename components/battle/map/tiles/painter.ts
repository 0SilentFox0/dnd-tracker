import type { TileDefinition } from '@/lib/constants/tilesets/types';
import type { GridWindow } from '@/lib/utils/battle/grid';
import { CHUNK_SIDE, chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import { edgeMask } from '@/lib/utils/battle/tiles/autotile';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';
import { variantFor } from '@/lib/utils/battle/tiles/variant';

export interface TileRasterAsset {
    image: CanvasImageSource;
    variants?: readonly { image: CanvasImageSource; weight: number }[];
}

export type TileRasterAssets = Readonly<
    Record<number, TileRasterAsset | undefined>
>;

const LAYER_ORDER: readonly TileLayer[] = [
    'ground',
    'wallfill',
    'edge-art',
    'objects',
];

function tileAt(
    chunks: TileLayerChunks,
    layer: TileLayer,
    x: number,
    y: number
): number {
    if (x < 0 || y < 0) return 0;

    const cx = Math.floor(x / CHUNK_SIDE);

    const cy = Math.floor(y / CHUNK_SIDE);

    const chunk = chunks[layer]?.[chunkKey(cx, cy)];

    return chunk?.[(y % CHUNK_SIDE) * CHUNK_SIDE + (x % CHUNK_SIDE)] ?? 0;
}

function variantImage(
    seed: string,
    x: number,
    y: number,
    id: number,
    asset: TileRasterAsset
) {
    const variants = asset.variants;

    if (!variants?.length) return asset.image;

    const index = variantFor(
        seed,
        x,
        y,
        id,
        variants.map((variant, variantIndex) => ({
            asset: `${id}:${variantIndex}`,
            weight: variant.weight,
        }))
    );

    return variants[index].image;
}

function drawCell(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    image: CanvasImageSource,
    definition: TileDefinition,
    x: number,
    y: number,
    origin: GridWindow,
    cellPx: number
) {
    const footprint = definition.footprint;

    const isEdgeArt = definition.layer === 'edge-art';

    const edgeWidth = isEdgeArt ? cellPx : footprint.cols * cellPx;

    const edgeHeight = isEdgeArt ? cellPx : footprint.rows * cellPx;

    const edgeX = (x - origin.x) * cellPx;

    const edgeY = (y - origin.y) * cellPx;

    ctx.drawImage(image, edgeX, edgeY, edgeWidth, edgeHeight);
}

function drawGroundBlend(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    input: {
        chunks: TileLayerChunks;
        assets: TileRasterAssets;
        catalog: Readonly<Record<number, TileDefinition | undefined>>;
        id: number;
        x: number;
        y: number;
        origin: GridWindow;
        cellPx: number;
        seed: string;
    }
) {
    const { chunks, assets, catalog, id, x, y, origin, cellPx, seed } = input;

    const x0 = (x - origin.x) * cellPx;

    const y0 = (y - origin.y) * cellPx;

    const neighbors = [
        {
            bit: 1,
            x,
            y: y - 1,
            points: [
                [0, 0],
                [cellPx, 0],
                [cellPx / 2, cellPx / 2],
            ],
        },
        {
            bit: 2,
            x: x + 1,
            y,
            points: [
                [cellPx, 0],
                [cellPx, cellPx],
                [cellPx / 2, cellPx / 2],
            ],
        },
        {
            bit: 4,
            x,
            y: y + 1,
            points: [
                [cellPx, cellPx],
                [0, cellPx],
                [cellPx / 2, cellPx / 2],
            ],
        },
        {
            bit: 8,
            x: x - 1,
            y,
            points: [
                [0, cellPx],
                [0, 0],
                [cellPx / 2, cellPx / 2],
            ],
        },
    ] as const;

    const mask = edgeMask({
        north:
            tileAt(chunks, 'ground', x, y - 1) !== 0 &&
            tileAt(chunks, 'ground', x, y - 1) !== id,
        east:
            tileAt(chunks, 'ground', x + 1, y) !== 0 &&
            tileAt(chunks, 'ground', x + 1, y) !== id,
        south:
            tileAt(chunks, 'ground', x, y + 1) !== 0 &&
            tileAt(chunks, 'ground', x, y + 1) !== id,
        west:
            tileAt(chunks, 'ground', x - 1, y) !== 0 &&
            tileAt(chunks, 'ground', x - 1, y) !== id,
    });

    for (const neighbor of neighbors) {
        if ((mask & neighbor.bit) === 0) continue;

        const neighborId = tileAt(chunks, 'ground', neighbor.x, neighbor.y);

        const definition = catalog[neighborId];

        const asset = assets[neighborId];

        if (!definition || !asset) continue;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0 + neighbor.points[0][0], y0 + neighbor.points[0][1]);
        ctx.lineTo(x0 + neighbor.points[1][0], y0 + neighbor.points[1][1]);
        ctx.lineTo(x0 + neighbor.points[2][0], y0 + neighbor.points[2][1]);
        ctx.closePath();
        ctx.clip();
        drawCell(
            ctx,
            variantImage(seed, x, y, neighborId, asset),
            definition,
            x,
            y,
            origin,
            cellPx
        );
        ctx.restore();
    }
}

export function drawTileViewport(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    input: {
        chunks: TileLayerChunks;
        assets: TileRasterAssets;
        catalog: Readonly<Record<number, TileDefinition | undefined>>;
        window: GridWindow;
        cellPx: number;
        seed: string;
        layers?: readonly TileLayer[];
    }
): void {
    const { chunks, assets, catalog, window, cellPx, seed } = input;

    const endX = window.x + window.cols;

    const endY = window.y + window.rows;

    ctx.clearRect(0, 0, window.cols * cellPx, window.rows * cellPx);

    for (const layer of input.layers ?? LAYER_ORDER) {
        const startCx = Math.floor(window.x / CHUNK_SIDE);

        const startCy = Math.floor(window.y / CHUNK_SIDE);

        const endCx = Math.floor((endX - 1) / CHUNK_SIDE);

        const endCy = Math.floor((endY - 1) / CHUNK_SIDE);

        for (let cy = startCy; cy <= endCy; cy++) {
            for (let cx = startCx; cx <= endCx; cx++) {
                const chunk = chunks[layer]?.[chunkKey(cx, cy)];

                if (!chunk) continue;

                const left = Math.max(window.x, cx * CHUNK_SIDE);

                const top = Math.max(window.y, cy * CHUNK_SIDE);

                const right = Math.min(endX, (cx + 1) * CHUNK_SIDE);

                const bottom = Math.min(endY, (cy + 1) * CHUNK_SIDE);

                for (let y = top; y < bottom; y++) {
                    for (let x = left; x < right; x++) {
                        const id = tileAt(chunks, layer, x, y);

                        if (id === 0) continue;

                        const definition = catalog[id];

                        const asset = assets[id];

                        if (!definition || !asset) continue;

                        const image = variantImage(seed, x, y, id, asset);

                        if (
                            layer === 'ground' &&
                            definition.autotile === 'ground-16'
                        ) {
                            drawCell(
                                ctx,
                                image,
                                definition,
                                x,
                                y,
                                window,
                                cellPx
                            );
                            drawGroundBlend(ctx, {
                                chunks,
                                assets,
                                catalog,
                                id,
                                x,
                                y,
                                origin: window,
                                cellPx,
                                seed,
                            });
                        } else {
                            drawCell(
                                ctx,
                                image,
                                definition,
                                x,
                                y,
                                window,
                                cellPx
                            );
                        }
                    }
                }
            }
        }
    }
}
