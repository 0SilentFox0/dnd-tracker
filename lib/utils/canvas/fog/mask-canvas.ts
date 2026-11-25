import type { FogMask } from './fog-mask';

export interface FeatheredMask {
    key: string;
    canvas: HTMLCanvasElement;
    gutter: number;
}

const CACHE_SIZE = 4;

const cache = new Map<string, FeatheredMask>();

const FEATHER_CELLS = 0.45;

function newCanvas(width: number, height: number) {
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    return canvas;
}

function extendEdges(
    ctx: CanvasRenderingContext2D,
    base: HTMLCanvasElement,
    g: number
) {
    const { width: w, height: h } = base;

    ctx.drawImage(base, 0, 0, 1, h, 0, g, g, h);
    ctx.drawImage(base, w - 1, 0, 1, h, g + w, g, g, h);
    ctx.drawImage(base, 0, 0, w, 1, g, 0, w, g);
    ctx.drawImage(base, 0, h - 1, w, 1, g, g + h, w, g);
    ctx.drawImage(base, 0, 0, 1, 1, 0, 0, g, g);
    ctx.drawImage(base, w - 1, 0, 1, 1, g + w, 0, g, g);
    ctx.drawImage(base, 0, h - 1, 1, 1, 0, g + h, g, g);
    ctx.drawImage(base, w - 1, h - 1, 1, 1, g + w, g + h, g, g);
}

/** Blur-feathered copy of the mask with edge-replicated gutter, so border cells keep their level. */
export function featherMask(mask: FogMask): FeatheredMask | null {
    const hit = cache.get(mask.key);

    if (hit) return hit;

    const base = newCanvas(mask.width, mask.height);

    const baseCtx = base.getContext('2d');

    if (!baseCtx) return null;

    const image = baseCtx.createImageData(mask.width, mask.height);

    image.data.set(mask.data);
    baseCtx.putImageData(image, 0, 0);

    const blur = mask.px * FEATHER_CELLS;

    const supported = typeof baseCtx.filter === 'string';

    const gutter = supported ? Math.ceil(blur * 3) : 0;

    const canvas = newCanvas(
        mask.width + 2 * gutter,
        mask.height + 2 * gutter
    );

    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    if (supported) {
        extendEdges(ctx, base, gutter);
        ctx.filter = `blur(${blur}px)`;
    }

    ctx.drawImage(base, gutter, gutter);

    if (supported) ctx.filter = 'none';

    const feathered = { key: mask.key, canvas, gutter };

    cache.set(mask.key, feathered);

    if (cache.size > CACHE_SIZE) cache.delete([...cache.keys()][0]);

    return feathered;
}

export function crossfadeMasks(
    target: HTMLCanvasElement,
    from: FeatheredMask,
    to: FeatheredMask,
    progress: number
) {
    const ctx = target.getContext('2d');

    if (!ctx) return;

    if (target.width !== to.canvas.width) target.width = to.canvas.width;

    if (target.height !== to.canvas.height) target.height = to.canvas.height;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.globalAlpha = 1 - progress;
    ctx.drawImage(from.canvas, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = progress;
    ctx.drawImage(to.canvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}
