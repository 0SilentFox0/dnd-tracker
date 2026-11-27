import sharp from 'sharp';

import type { StampRow } from './csv';

export interface Rgba {
    width: number;
    height: number;
    data: Uint8Array;
}

export interface Box {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    area: number;
}

const MAGENTA = [255, 0, 255] as const;

export const STAMP_UNIT = 256;

export const STAMP_MAX_BYTES = 200 * 1024;

export function keyMagenta(
    img: Rgba,
    { threshold = 90, soft = 40 }: { threshold?: number; soft?: number } = {}
): Rgba {
    const { width, height } = img;

    const data = new Uint8Array(img.data);

    for (let p = 0; p < width * height; p++) {
        const i = p * 4;

        const dist = Math.hypot(
            data[i] - MAGENTA[0],
            data[i + 1] - MAGENTA[1],
            data[i + 2] - MAGENTA[2]
        );

        if (dist <= threshold) data[i + 3] = 0;
        else if (dist < threshold + soft)
            data[i + 3] = Math.round((data[i + 3] * (dist - threshold)) / soft);
    }

    const alphaAt = (x: number, y: number) =>
        x < 0 || y < 0 || x >= width || y >= height
            ? 0
            : data[(y * width + x) * 4 + 3];

    const edge: number[] = [];

    const transparent: number[] = [];

    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const a = alphaAt(x, y);

            if (a === 0) continue;

            const touches =
                alphaAt(x - 1, y) === 0 ||
                alphaAt(x + 1, y) === 0 ||
                alphaAt(x, y - 1) === 0 ||
                alphaAt(x, y + 1) === 0;

            if (a < 255 || touches) edge.push(y * width + x);

            if (touches) transparent.push(y * width + x);
        }

    for (const p of edge) {
        const i = p * 4;

        const spill = Math.min(data[i], data[i + 2]) - data[i + 1];

        if (spill > 0) {
            data[i] -= spill;
            data[i + 2] -= spill;
        }
    }

    for (const p of transparent) data[p * 4 + 3] = 0;

    return { width, height, data };
}

export function components(img: Rgba, minArea = 64): Box[] {
    const { width, height, data } = img;

    const seen = new Uint8Array(width * height);

    const boxes: Box[] = [];

    for (let start = 0; start < width * height; start++) {
        if (seen[start] || data[start * 4 + 3] === 0) continue;

        const stack = [start];

        const box: Box = {
            x0: width,
            y0: height,
            x1: -1,
            y1: -1,
            area: 0,
        };

        seen[start] = 1;

        while (stack.length) {
            const p = stack.pop()!;

            const x = p % width;

            const y = (p - x) / width;

            box.area++;
            box.x0 = Math.min(box.x0, x);
            box.x1 = Math.max(box.x1, x);
            box.y0 = Math.min(box.y0, y);
            box.y1 = Math.max(box.y1, y);

            for (let dy = -1; dy <= 1; dy++)
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;

                    const ny = y + dy;

                    if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                        continue;

                    const n = ny * width + nx;

                    if (seen[n] || data[n * 4 + 3] === 0) continue;

                    seen[n] = 1;
                    stack.push(n);
                }
        }

        if (box.area >= minArea) boxes.push(box);
    }

    const centre = (b: Box) => (b.y0 + b.y1) / 2;

    const tolerance = height / 6;

    const sorted = [...boxes].sort((a, b) => centre(a) - centre(b));

    const lines: Box[][] = [];

    for (const b of sorted) {
        const line = lines[lines.length - 1];

        if (line && centre(b) - centre(line[0]) <= tolerance) line.push(b);
        else lines.push([b]);
    }

    return lines.flatMap((l) => l.sort((a, b) => a.x0 - b.x0));
}

export function crop(img: Rgba, box: Box, pad: number): Rgba {
    const x0 = Math.max(0, box.x0 - pad);

    const y0 = Math.max(0, box.y0 - pad);

    const x1 = Math.min(img.width - 1, box.x1 + pad);

    const y1 = Math.min(img.height - 1, box.y1 + pad);

    const width = x1 - x0 + 1;

    const height = y1 - y0 + 1;

    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
        const from = ((y0 + y) * img.width + x0) * 4;

        data.set(img.data.subarray(from, from + width * 4), y * width * 4);
    }

    return { width, height, data };
}

function alphaBounds(img: Rgba): Box | null {
    let x0 = img.width;

    let y0 = img.height;

    let x1 = -1;

    let y1 = -1;

    for (let y = 0; y < img.height; y++)
        for (let x = 0; x < img.width; x++)
            if (img.data[(y * img.width + x) * 4 + 3] > 0) {
                x0 = Math.min(x0, x);
                x1 = Math.max(x1, x);
                y0 = Math.min(y0, y);
                y1 = Math.max(y1, y);
            }

    return x1 < 0 ? null : { x0, y0, x1, y1, area: 0 };
}

const raw = (img: Rgba) =>
    sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), {
        raw: { width: img.width, height: img.height, channels: 4 },
    });

export async function normalize(
    img: Rgba,
    cols: number,
    rows: number
): Promise<Buffer> {
    const bounds = alphaBounds(img);

    if (!bounds) throw new Error('empty image');

    const trimmed = await raw(img)
        .extract({
            left: bounds.x0,
            top: bounds.y0,
            width: bounds.x1 - bounds.x0 + 1,
            height: bounds.y1 - bounds.y0 + 1,
        })
        .png()
        .toBuffer();

    const fitted = sharp(trimmed).resize(cols * STAMP_UNIT, rows * STAMP_UNIT, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    const high = await fitted.clone().webp({ quality: 85 }).toBuffer();

    return high.length > STAMP_MAX_BYTES
        ? fitted.webp({ quality: 70 }).toBuffer()
        : high;
}

export async function sliceSheet(
    file: string,
    rows: StampRow[],
    mapping?: number[]
): Promise<{ row: StampRow; webp: Buffer }[]> {
    const { data, info } = await sharp(file)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const keyed = keyMagenta({
        width: info.width,
        height: info.height,
        data: new Uint8Array(data),
    });

    const boxes = components(keyed);

    if (boxes.length < rows.length)
        throw new Error(
            `merged objects: found ${boxes.length} components, expected ${rows.length}`
        );

    if (boxes.length > rows.length)
        throw new Error(
            `extra components: found ${boxes.length}, expected ${rows.length}`
        );

    if (
        mapping &&
        (mapping.length !== rows.length ||
            new Set(mapping).size !== rows.length ||
            mapping.some(
                (m) => !Number.isInteger(m) || m < 0 || m >= rows.length
            ))
    )
        throw new Error('invalid --map: expected a permutation of row indexes');

    return Promise.all(
        boxes.map(async (box, i) => {
            const row = rows[mapping ? mapping[i] : i];

            return {
                row,
                webp: await normalize(crop(keyed, box, 2), row.cols, row.rows),
            };
        })
    );
}
