import * as path from 'path';
import sharp from 'sharp';

export const ICON_SIZE = 768;

const HASH_SIDE = 8;

export interface ImageReport {
    file: string;
    width: number;
    height: number;
    cornerAlpha: number | null;
    centerAlpha: number | null;
    hash: string;
}

export interface BatchIssue {
    file: string;
    problem: string;
}

export const hamming = (a: string, b: string) => {
    let n = 0;

    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;

    return n;
};

export async function inspectImage(file: string): Promise<ImageReport> {
    const meta = await sharp(file).metadata();

    const { data } = await sharp(file)
        .resize(HASH_SIDE, HASH_SIDE, { fit: 'fill' })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const mean = data.reduce((s, v) => s + v, 0) / data.length;

    const hash = Array.from(data, (v) => (v > mean ? '1' : '0')).join('');

    const alphaAt = async (x: number, y: number) => {
        if (!meta.hasAlpha) return null;

        const px = await sharp(file)
            .extract({ left: x, top: y, width: 1, height: 1 })
            .ensureAlpha()
            .raw()
            .toBuffer();

        return px[3];
    };

    return {
        file,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        cornerAlpha: await alphaAt(0, 0),
        centerAlpha: await alphaAt(
            Math.floor((meta.width ?? 2) / 2),
            Math.floor((meta.height ?? 2) / 2)
        ),
        hash,
    };
}

export function issuesOf(
    reports: ImageReport[],
    opts: { round: boolean; minDistance: number }
): BatchIssue[] {
    const issues: BatchIssue[] = [];

    for (const r of reports) {
        const name = path.basename(r.file);

        if (r.width !== ICON_SIZE || r.height !== ICON_SIZE)
            issues.push({
                file: name,
                problem: `size ${r.width}x${r.height}, expected ${ICON_SIZE}x${ICON_SIZE}`,
            });

        if (opts.round && !(r.cornerAlpha === 0 && r.centerAlpha === 255))
            issues.push({
                file: name,
                problem:
                    'not a round token (corner must be transparent, centre opaque)',
            });

        if (!opts.round && r.cornerAlpha !== null && r.cornerAlpha < 255)
            issues.push({
                file: name,
                problem: 'unexpected transparent corner',
            });
    }

    for (let i = 0; i < reports.length; i++)
        for (let j = i + 1; j < reports.length; j++) {
            const d = hamming(reports[i].hash, reports[j].hash);

            if (d < opts.minDistance)
                issues.push({
                    file: path.basename(reports[i].file),
                    problem: `looks like ${path.basename(reports[j].file)} (hash distance ${d})`,
                });
        }

    return issues;
}

const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function contactSheet(
    files: { file: string; label: string }[],
    out: string,
    { columns = 10, tile = 128 } = {}
): Promise<void> {
    const labelH = 18;

    const rows = Math.ceil(files.length / columns);

    const tiles = await Promise.all(
        files.map(async ({ file, label }, i) => {
            const img = await sharp(file)
                .resize(tile, tile, {
                    fit: 'contain',
                    background: { r: 24, g: 24, b: 28, alpha: 1 },
                })
                .flatten({ background: { r: 24, g: 24, b: 28 } })
                .png()
                .toBuffer();

            const text = Buffer.from(
                `<svg width="${tile}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="2" y="13" font-size="11" font-family="sans-serif" fill="#ddd">${esc(label.slice(0, 22))}</text></svg>`
            );

            return [
                {
                    input: img,
                    left: (i % columns) * tile,
                    top: Math.floor(i / columns) * (tile + labelH),
                },
                {
                    input: text,
                    left: (i % columns) * tile,
                    top: Math.floor(i / columns) * (tile + labelH) + tile,
                },
            ];
        })
    );

    await sharp({
        create: {
            width: columns * tile,
            height: rows * (tile + labelH),
            channels: 3,
            background: { r: 24, g: 24, b: 28 },
        },
    })
        .composite(tiles.flat())
        .png()
        .toFile(out);
}
