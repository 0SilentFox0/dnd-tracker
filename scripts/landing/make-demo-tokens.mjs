#!/usr/bin/env node
// Cuts the token portraits CombatDemo reuses (actors in the log, overlay foes) out of each locale's battle frame.
// Usage: node scripts/landing/make-demo-tokens.mjs   (centres are % of the frame, w is the crop width in % of frame width)
import path from 'node:path';

import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SIZE = 128;

const SHEETS = {
    en: [
        { x: 16.7, y: 23.6, w: 5.1 },
        { x: 38.9, y: 58.8, w: 5.1 },
        { x: 61.1, y: 77, w: 4.7 },
    ],
    uk: [
        { x: 34.8, y: 62, w: 2.5 },
        { x: 34.8, y: 28.7, w: 2.5 },
        { x: 63.5, y: 49, w: 4.4 },
    ],
};

for (const [locale, tokens] of Object.entries(SHEETS)) {
    const dir = path.join(ROOT, 'public/landing', locale);
    const src = path.join(dir, 'screen-battle.webp');
    const { width, height } = await sharp(src).metadata();
    const tiles = await Promise.all(
        tokens.map(async ({ x, y, w }) => {
            const side = Math.round((w / 100) * width);
            return sharp(src)
                .extract({
                    left: Math.round((x / 100) * width - side / 2),
                    top: Math.round((y / 100) * height - side / 2),
                    width: side,
                    height: side,
                })
                .resize(SIZE, SIZE)
                .toBuffer();
        })
    );
    await sharp({
        create: {
            width: SIZE * tiles.length,
            height: SIZE,
            channels: 3,
            background: '#120e0b',
        },
    })
        .composite(tiles.map((input, i) => ({ input, left: i * SIZE, top: 0 })))
        .webp({ quality: 80 })
        .toFile(path.join(dir, 'demo-tokens.webp'));
}
