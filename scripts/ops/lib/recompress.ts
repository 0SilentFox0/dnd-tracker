import sharp from 'sharp';

export interface RecompressOptions {
    maxEdge: number;
    minSavingPct: number;
}

export interface RecompressResult {
    bytes: Buffer;
    before: number;
    after: number;
    resized: boolean;
    format: 'png' | 'jpeg' | 'webp';
}

const WEBP_QUALITY = 80;

const JPEG_QUALITY = 82;

/** Same-format re-encode so the stored path and content type stay valid; null = skip (animated, unsupported, or saves too little). */
export async function recompressImage(
    input: Buffer,
    options: RecompressOptions
): Promise<RecompressResult | null> {
    const meta = await sharp(input).metadata();

    if (!meta.format || (meta.pages ?? 1) > 1) return null;

    if (meta.format !== 'png' && meta.format !== 'jpeg' && meta.format !== 'webp')
        return null;

    const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);

    const resized = longEdge > options.maxEdge;

    let pipeline = sharp(input).rotate().keepIccProfile();

    if (resized)
        pipeline = pipeline.resize({
            width: options.maxEdge,
            height: options.maxEdge,
            fit: 'inside',
            withoutEnlargement: true,
        });

    const encoded =
        meta.format === 'png'
            ? pipeline.png({ compressionLevel: 9, effort: 10 })
            : meta.format === 'jpeg'
              ? pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
              : pipeline.webp({ quality: WEBP_QUALITY });

    const bytes = await encoded.toBuffer();

    const saving = ((input.length - bytes.length) / input.length) * 100;

    if (bytes.length >= input.length || saving < options.minSavingPct)
        return null;

    return {
        bytes,
        before: input.length,
        after: bytes.length,
        resized,
        format: meta.format,
    };
}

export interface BucketTotals {
    objects: number;
    changed: number;
    skipped: number;
    before: number;
    after: number;
}

export const emptyTotals = (): BucketTotals => ({
    objects: 0,
    changed: 0,
    skipped: 0,
    before: 0,
    after: 0,
});

export function addObject(
    totals: BucketTotals,
    size: number,
    result: RecompressResult | null
): void {
    totals.objects += 1;
    totals.before += size;

    if (result) {
        totals.changed += 1;
        totals.after += result.after;

        return;
    }

    totals.skipped += 1;
    totals.after += size;
}
