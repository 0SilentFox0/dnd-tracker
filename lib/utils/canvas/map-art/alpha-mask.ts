export interface AlphaMask {
    w: number;
    h: number;
    data: Uint8Array;
}

const OPAQUE = 32;

function surface(size: number) {
    if (typeof OffscreenCanvas !== 'undefined')
        return new OffscreenCanvas(size, size);

    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');

    canvas.width = size;
    canvas.height = size;

    return canvas;
}

export function buildAlphaMask(
    img: CanvasImageSource,
    size = 64
): AlphaMask | null {
    try {
        const canvas = surface(size);

        const ctx = canvas?.getContext('2d') as
            | CanvasRenderingContext2D
            | OffscreenCanvasRenderingContext2D
            | null;

        if (!canvas || !ctx) return null;

        ctx.drawImage(img, 0, 0, size, size);

        const { data } = ctx.getImageData(0, 0, size, size);

        const mask = new Uint8Array(size * size);

        for (let i = 0; i < mask.length; i++)
            mask[i] = data[i * 4 + 3] > OPAQUE ? 1 : 0;

        return { w: size, h: size, data: mask };
    } catch {
        return null;
    }
}

export function alphaHit(mask: AlphaMask | null, u: number, v: number): boolean {
    if (!mask) return true;

    if (u < 0 || u > 1 || v < 0 || v > 1) return false;

    const x = Math.min(mask.w - 1, Math.floor(u * mask.w));

    const y = Math.min(mask.h - 1, Math.floor(v * mask.h));

    return mask.data[y * mask.w + x] === 1;
}
