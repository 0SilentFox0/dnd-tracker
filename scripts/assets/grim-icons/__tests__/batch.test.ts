import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';

import { contactSheet, hamming, inspectImage, issuesOf } from '../batch';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grim-batch-'));

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const solid = async (name: string, size: number, rgba: number[]) => {
    const file = path.join(dir, name);

    await sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: rgba[0], g: rgba[1], b: rgba[2], alpha: rgba[3] },
        },
    })
        .png()
        .toFile(file);

    return file;
};

const stripes = async (name: string, vertical: boolean) => {
    const file = path.join(dir, name);

    const half = Buffer.from(
        Array.from({ length: 768 * 768 }, (_, i) => {
            const k = vertical ? i % 768 : Math.floor(i / 768);

            return k < 384 ? 255 : 0;
        })
    );

    await sharp(half, { raw: { width: 768, height: 768, channels: 1 } })
        .png()
        .toFile(file);

    return file;
};

describe('grim batch checks', () => {
    it('flags wrong size, square tokens and near-duplicates', async () => {
        const ok = await stripes('a.png', true);

        const same = await stripes('b.png', true);

        const other = await stripes('c.png', false);

        const small = await solid('small.png', 512, [10, 10, 10, 255]);

        const reports = await Promise.all(
            [ok, same, other, small].map(inspectImage)
        );

        const problems = issuesOf(reports, {
            round: false,
            minDistance: 6,
        }).map((i) => i.problem);

        expect(problems.some((p) => p.includes('512x512'))).toBe(true);
        expect(problems.some((p) => p.includes('looks like b.png'))).toBe(true);
        expect(problems.some((p) => p.includes('looks like c.png'))).toBe(
            false
        );
    });

    it('requires a transparent corner for round tokens', async () => {
        const square = await inspectImage(
            await solid('sq.png', 768, [20, 20, 20, 255])
        );

        expect(
            issuesOf([square], { round: true, minDistance: 0 }).map(
                (i) => i.problem
            )
        ).toEqual([expect.stringContaining('not a round token')]);
    });

    it('measures hash distance and writes a contact sheet', async () => {
        expect(hamming('0101', '0110')).toBe(2);

        const out = path.join(dir, 'sheet.png');

        await contactSheet(
            [{ file: path.join(dir, 'a.png'), label: 'A <&>' }],
            out,
            { columns: 2, tile: 64 }
        );

        expect((await sharp(out).metadata()).width).toBe(128);
    });
});
