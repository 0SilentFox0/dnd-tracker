import {
    BLOCKED_MATERIALS,
    floorMaterial,
    OPENING_MATERIALS,
    WALL_MATERIALS,
} from '@/lib/constants/map-art/materials';
import { stampDef } from '@/lib/constants/map-art/stamps';
import { gridMetrics } from '@/lib/utils/battle/grid/layout';
import { decodeFloors } from '@/lib/utils/battle/map-art/floors';
import type { MapDims } from '@/lib/utils/battle/map-art/scene';
import { loadImage } from '@/lib/utils/common/image-decode';
import type { GridKind, GridPoint } from '@/types/battle-grid';
import type { MapArtScene } from '@/types/battle-map';

export type ArtCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface PixelRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ArtAssets {
    get(url: string): CanvasImageSource | undefined;
}

export interface PaintInput {
    scene: MapArtScene;
    map: MapDims;
    cellPx: number;
    seed: string;
    assets: ArtAssets;
    clip?: PixelRect;
    createLayer?: (w: number, h: number) => { ctx: ArtCtx; canvas: CanvasImageSource };
}

export const TEXTURE_PX = 256;

export interface PatternSource {
    get(url: string, matrix?: DOMMatrix2DInit): CanvasPattern | null;
}

export interface PaintEnv {
    ctx: ArtCtx;
    scene: MapArtScene;
    map: MapDims;
    grid: GridKind;
    cellPx: number;
    k: number;
    seed: string;
    assets: ArtAssets;
    clip: PixelRect | null;
    patterns: PatternSource;
    createLayer: PaintInput['createLayer'];
}

export const wallTexture = (id: string): string | undefined =>
    WALL_MATERIALS.find((m) => m.id === id)?.texture;

export const openingSprite = (id: string): string | null =>
    OPENING_MATERIALS.find((m) => m.id === id)?.sprite ?? null;

export const blockedSprite = (id: string): string | undefined =>
    BLOCKED_MATERIALS.find((m) => m.id === id)?.sprite;

export function artTextureUrls(scene: MapArtScene): string[] {
    const urls = new Set<string>();

    for (const cells of Object.values(decodeFloors(scene.floors))) {
        for (const code of new Set(cells)) {
            const tex = code ? floorMaterial(code)?.texture : undefined;

            if (tex) urls.add(tex);
        }
    }

    for (const id of new Set(Object.values(scene.walls))) {
        const tex = wallTexture(id);

        if (tex) urls.add(tex);
    }

    for (const o of Object.values(scene.openings)) {
        const sprite = o.kind === 'door' ? null : openingSprite(o.material);

        if (sprite) urls.add(sprite);
    }

    for (const id of Object.values(scene.blocked)) {
        const sprite = id ? blockedSprite(id) : undefined;

        if (sprite) urls.add(sprite);
    }

    for (const s of scene.stamps) {
        const def = stampDef(s.asset);

        if (def) urls.add(def.file);
    }

    return [...urls];
}

const imageCache = new Map<string, Promise<CanvasImageSource | undefined>>();

const loadedImages = new Map<string, CanvasImageSource>();

export const loadedImage = (url: string): CanvasImageSource | undefined =>
    loadedImages.get(url);

function loadCached(url: string): Promise<CanvasImageSource | undefined> {
    const cached = imageCache.get(url);

    if (cached) return cached;

    const promise = loadImage(url)
        .then((img): CanvasImageSource => {
            loadedImages.set(url, img);

            return img;
        })
        .catch(() => {
            imageCache.delete(url);

            return undefined;
        });

    imageCache.set(url, promise);

    return promise;
}

export async function loadArtAssets(urls: readonly string[]): Promise<ArtAssets> {
    const loaded = await Promise.all(urls.map(async (u) => [u, await loadCached(u)] as const));

    const map = new Map(loaded);

    return { get: (url) => map.get(url) };
}

export function makePatterns(
    ctx: ArtCtx,
    assets: ArtAssets,
    cellPx: number
): PatternSource {
    const cache = new Map<string, CanvasPattern | null>();

    const s = cellPx / TEXTURE_PX;

    return {
        get(url, matrix = { a: s, d: s }) {
            if (!cache.has(url)) {
                const img = assets.get(url);

                cache.set(url, img ? ctx.createPattern(img, 'repeat') : null);
            }

            const pattern = cache.get(url) ?? null;

            pattern?.setTransform(matrix);

            return pattern;
        },
    };
}

export function cellBox(grid: GridKind, p: GridPoint, k: number): PixelRect {
    const r = gridMetrics(grid).cellRect(p);

    return { x: r.x * k, y: r.y * k, width: r.width * k, height: r.height * k };
}

export function touches(
    clip: PixelRect | null,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    pad = 0
): boolean {
    if (!clip) return true;

    return (
        x1 >= clip.x - pad &&
        x0 <= clip.x + clip.width + pad &&
        y1 >= clip.y - pad &&
        y0 <= clip.y + clip.height + pad
    );
}

export const touchesBox = (clip: PixelRect | null, b: PixelRect, pad = 0): boolean =>
    touches(clip, b.x, b.y, b.x + b.width, b.y + b.height, pad);
