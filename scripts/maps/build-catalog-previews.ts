import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { getMapCatalogAsset } from '@/lib/api/map-catalog';
import { listVttMapCatalog } from '@/lib/server/map-catalog/vtt-maps';
import { parseUvtt } from '@/lib/utils/battle/uvtt/parse';

const output = path.join(process.cwd(), 'public/assets/map-catalog');

async function main() {
    const entries = await listVttMapCatalog();

    const results = new Array(entries.length);

    let cursor = 0;

    await mkdir(output, { recursive: true });

    async function worker() {
        for (;;) {
            const index = cursor++;

            const entry = entries[index];

            if (!entry) return;

            const text = await getMapCatalogAsset(entry);

            const raw = JSON.parse(text) as { image?: unknown };

            const source = typeof raw.image === 'string' ? raw.image : '';

            const payload = source.startsWith('data:')
                ? source.slice(source.indexOf(',') + 1)
                : source;

            if (!payload)
                throw new Error(`Map has no image: ${entry.filePath}`);

            const file = `${createHash('sha256').update(entry.id).digest('hex').slice(0, 20)}.webp`;

            await sharp(Buffer.from(payload, 'base64'))
                .rotate()
                .resize({
                    width: 640,
                    height: 640,
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .webp({ quality: 70, effort: 4 })
                .toFile(path.join(output, file));

            let importable = true;

            try {
                parseUvtt(text);
            } catch {
                importable = false;
            }

            results[index] = {
                ...entry,
                previewUrl: `/assets/map-catalog/${file}`,
                importable,
            };
            process.stdout.write(
                `Generated ${index + 1}/${entries.length}: ${entry.name}\n`
            );
        }
    }

    await Promise.all(Array.from({ length: 2 }, () => worker()));
    await writeFile(
        path.join(output, 'index.json'),
        `${JSON.stringify(results, null, 2)}\n`
    );
}

void main();
