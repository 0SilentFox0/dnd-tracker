import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { STAMPS, stampDef } from '../stamps';

import {
    buildDefs,
    parseStampsCsv,
    renderStampsData,
} from '@/scripts/assets/stamps/csv';
import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import enMaps from '@/messages/en/maps.json';
import enNames from '@/messages/en/tileLabels.json';
import ukMaps from '@/messages/uk/maps.json';
import ukNames from '@/messages/uk/tileLabels.json';

const ROOT = process.cwd();

const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const LEGACY_FILE = /^tiles_.+\.png$/;

const LEGACY = /^\/assets\/battle-tiles\/objects\/tiles_(.+)\.png$/;

describe('stamp registry', () => {
    it('stamps-data.ts matches the CSV', () => {
        const rows = parseStampsCsv(read('docs/assets/stamp-prompts/stamps.csv'));
        const defs = buildDefs(rows, (f) => existsSync(join(ROOT, 'public', f)));

        expect(renderStampsData(defs)).toBe(
            read('lib/constants/map-art/stamps-data.ts')
        );
    });

    it('has unique ids, existing files and consistent footprints', () => {
        expect(new Set(STAMPS.map((d) => d.id)).size).toBe(STAMPS.length);

        for (const d of STAMPS) {
            expect(existsSync(join(ROOT, 'public', d.file))).toBe(true);

            if (d.blocks) {
                expect(d.blocks.w).toBeLessThanOrEqual(d.cols);
                expect(d.blocks.h).toBeLessThanOrEqual(d.rows);
            }

            expect(stampDef(d.id)).toBe(d);
        }
    });

    it('legacy mechanics equal the tile catalog', () => {
        const legacy = STAMPS.filter((d) => LEGACY.test(d.file));

        expect(legacy).toHaveLength(35);

        for (const d of legacy) {
            const tile = TILE_CATALOG.find((t) => t.key === d.id);

            expect(tile, d.id).toBeDefined();
            expect(!!d.blocks, d.id).toBe(tile!.blocks);
            expect(!!d.sight, d.id).toBe(tile!.blocksSight);
            expect({ cols: d.cols, rows: d.rows }).toEqual(tile!.footprint);

            if (d.blocks)
                expect({ w: d.blocks.w, h: d.blocks.h }).toEqual({
                    w: d.cols,
                    h: d.rows,
                });
        }
    });

    it('legacy names exist in both locales', () => {
        for (const d of STAMPS.filter((s) => s.nameKey.startsWith('tileLabels.'))) {
            const key = d.nameKey.slice('tileLabels.'.length);

            expect(enNames).toHaveProperty([key]);
            expect(ukNames).toHaveProperty([key]);
        }
    });

    it('every non-legacy CSV row has a name and category in both locales', () => {
        const rows = parseStampsCsv(read('docs/assets/stamp-prompts/stamps.csv'));

        for (const maps of [enMaps, ukMaps]) {
            const stamps = maps.editor.stamps as {
                name: Record<string, string>;
                category: Record<string, string>;
            };

            for (const r of rows.filter((x) => !LEGACY_FILE.test(x.file))) {
                const id = r.file.replace(/\.webp$/, '');

                expect(stamps.name[id], id).toBeTruthy();
                expect(stamps.category[r.category], r.category).toBeTruthy();
            }
        }
    });
});
