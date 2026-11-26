import type { ArtCtx, PaintInput } from './assets';
import { paintScene } from './paint-scene';

import { BATTLE_MAP_BACKGROUND_TYPES } from '@/lib/constants/map-limits';
import { BAKE, bakeCellPx, bakePixelSize, nextBakeCellPx } from '@/lib/utils/battle/map-art/bake-size';

export class BakeError extends Error {
    constructor(readonly code: 'too-large' | 'canvas' | 'encode') {
        super(`map art bake failed: ${code}`);
    }
}

export interface BakeResult {
    blob: Blob;
    cellPx: number;
    width: number;
    height: number;
    ms: number;
}

interface BakeCanvas {
    ctx: ArtCtx;
    toBlob(type: string, quality: number): Promise<Blob>;
}

export interface BakeDeps {
    createCanvas(w: number, h: number): BakeCanvas;
    now(): number;
}

function defaultCreateCanvas(w: number, h: number): BakeCanvas {
    if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(w, h);

        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error('no 2d context');

        return {
            ctx,
            toBlob: (type, quality) => canvas.convertToBlob({ type, quality }),
        };
    }

    const canvas = document.createElement('canvas');

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('no 2d context');

    return {
        ctx,
        toBlob: (type, quality) =>
            new Promise((resolve, reject) =>
                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error('encode'))),
                    type,
                    quality
                )
            ),
    };
}

const DEFAULT_DEPS: BakeDeps = { createCanvas: defaultCreateCanvas, now: () => Date.now() };

function layerFactory(): NonNullable<PaintInput['createLayer']> {
    return (w, h) => {
        if (typeof OffscreenCanvas !== 'undefined') {
            const canvas = new OffscreenCanvas(w, h);

            const ctx = canvas.getContext('2d');

            if (!ctx) throw new BakeError('canvas');

            return { ctx, canvas };
        }

        const canvas = document.createElement('canvas');

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');

        if (!ctx) throw new BakeError('canvas');

        return { ctx, canvas };
    };
}

export async function bakeScene(
    input: Omit<PaintInput, 'cellPx' | 'clip' | 'createLayer'>,
    deps: BakeDeps = DEFAULT_DEPS
): Promise<BakeResult> {
    const started = deps.now();

    const createLayer = layerFactory();

    let cellPx = bakeCellPx(input.map);

    const render = async (px: number, quality: number) => {
        const size = bakePixelSize(input.map, px);

        let canvas: BakeCanvas;

        try {
            canvas = deps.createCanvas(size.width, size.height);
        } catch {
            return null;
        }

        try {
            paintScene(canvas.ctx, { ...input, cellPx: px, createLayer });
        } catch (error) {
            if (error instanceof BakeError && error.code === 'canvas') return null;

            throw error;
        }

        const blob = await canvas.toBlob('image/webp', quality);

        if (!(BATTLE_MAP_BACKGROUND_TYPES as string[]).includes(blob.type))
            throw new BakeError('encode');

        return { blob, size };
    };

    const result = (blob: Blob, size: { width: number; height: number }, px: number): BakeResult => ({
        blob,
        cellPx: px,
        width: size.width,
        height: size.height,
        ms: deps.now() - started,
    });

    let produced = false;

    for (let attempt = 0; attempt < BAKE.attempts; attempt++) {
        const out = await render(cellPx, BAKE.quality);

        if (!out) {
            cellPx = Math.floor(cellPx * 0.8);

            continue;
        }

        produced = true;

        if (out.blob.size <= BAKE.maxBytes) return result(out.blob, out.size, cellPx);

        cellPx = nextBakeCellPx(cellPx, out.blob.size);
    }

    if (!produced) throw new BakeError('canvas');

    const last = await render(cellPx, 0.7);

    if (!last) throw new BakeError('canvas');

    if (last.blob.size > BAKE.maxBytes) throw new BakeError('too-large');

    return result(last.blob, last.size, cellPx);
}
