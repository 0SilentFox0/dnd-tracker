import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

import { TILE_ASSET_MAX_BYTES } from '../tiles/validate';
import type { StampRow } from './csv';
import { STAMP_UNIT } from './slice';

export type StampAssetError =
    | 'not-webp'
    | 'no-alpha'
    | 'magenta-fringe'
    | 'too-large'
    | 'bad-size'
    | 'not-in-csv'
    | 'duplicate';

const FRINGE_RATIO = 0.002;

const SIZE_TOLERANCE = 2;

export async function validateStampBytes(
    bytes: Buffer,
    row: StampRow | undefined,
    seen?: Map<string, string>,
    label = ''
): Promise<StampAssetError[]> {
    const errors: StampAssetError[] = [];

    if (!row) errors.push('not-in-csv');

    let meta: sharp.Metadata;

    try {
        meta = await sharp(bytes).metadata();
    } catch {
        return [...errors, 'not-webp'];
    }

    if (meta.format !== 'webp') return [...errors, 'not-webp'];

    if (!meta.hasAlpha) errors.push('no-alpha');

    if (bytes.length > TILE_ASSET_MAX_BYTES) errors.push('too-large');

    if (
        row &&
        (Math.abs((meta.width ?? 0) - row.cols * STAMP_UNIT) > SIZE_TOLERANCE ||
            Math.abs((meta.height ?? 0) - row.rows * STAMP_UNIT) >
                SIZE_TOLERANCE)
    )
        errors.push('bad-size');

    if (meta.hasAlpha) {
        const { data } = await sharp(bytes)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        let opaque = 0;

        let fringe = 0;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;

            opaque++;

            if (data[i] > 200 && data[i + 2] > 200 && data[i + 1] < 80)
                fringe++;
        }

        if (opaque > 0 && fringe / opaque > FRINGE_RATIO)
            errors.push('magenta-fringe');
    }

    if (seen) {
        const hash = createHash('sha256').update(bytes).digest('hex');

        if (seen.has(hash)) errors.push('duplicate');
        else seen.set(hash, label);
    }

    return errors;
}

export async function validateStampAsset(
    file: string,
    row: StampRow | undefined,
    seen?: Map<string, string>
): Promise<StampAssetError[]> {
    return validateStampBytes(await readFile(file), row, seen, file);
}
