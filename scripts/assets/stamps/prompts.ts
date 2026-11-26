import { STAMP_BIOMES } from '@/lib/constants/map-art/stamps';

import type { StampBiome } from '@/lib/constants/map-art/stamp-types';
import type { StampRow } from './csv';

export const STAMP_STYLE_CORE =
    'Painterly fantasy game art in the spirit of classic fantasy RPG maps, rich but natural colours, no text, no letters, no watermark, no border, no frame. Strictly top-down orthographic view straight from above, no perspective, only a soft contact shadow directly under each object and no long directional shadows. The background is one flat solid pure magenta #FF00FF with no gradient, and no object may contain magenta.';

const SHEET_SIZE = 9;

export interface StampSheet {
    biome: StampBiome;
    priority: 1 | 2;
    rows: StampRow[];
}

export function sheetsOf(rows: readonly StampRow[]): StampSheet[] {
    const sheets: StampSheet[] = [];

    for (const biome of STAMP_BIOMES)
        for (const priority of [1, 2] as const) {
            const group = rows.filter(
                (r) => r.biome === biome && r.priority === priority
            );

            for (let i = 0; i < group.length; i += SHEET_SIZE)
                sheets.push({
                    biome,
                    priority,
                    rows: group.slice(i, i + SHEET_SIZE),
                });
        }

    return sheets;
}

const stripDot = (s: string) => s.replace(/\.$/, '');

export function sheetPrompt(sheet: StampSheet): string {
    const items = sheet.rows
        .map(
            (r, i) =>
                `${i + 1}. ${r.name} (${r.cols}x${r.rows} cells): ${stripDot(r.prompt)}.`
        )
        .join(' ');

    return `${STAMP_STYLE_CORE} A single sheet of ${sheet.rows.length} separate game map objects arranged on a 3x3 grid, in reading order from left to right and top to bottom. Leave a gap of at least 8% of the image side between objects and from the image edges, and no objects may touch or overlap. One grid cell is 5 feet; draw every object at the same scale, proportional to its footprint in cells (a 2x1 object is twice as wide as a 1x1 object). Square 1:1, 2048x2048. Objects: ${items}`;
}

const BIOME_TITLE: Record<StampBiome, string> = {
    dungeon: 'Підземелля',
    building: 'Будівля',
    nature: 'Природа',
    settlement: 'Поселення',
};

const isLegacy = (r: StampRow) => /^tiles_.+\.png$/.test(r.file);

export function renderStampsMd(rows: readonly StampRow[]): string {
    const fresh = rows.filter((r) => !isLegacy(r));
    const parts = [
        '# Промпти для штампів карти',
        '',
        'Згенеровано з `stamps.csv` (`pnpm assets:stamps prompts`); legacy-рядки з `tiles_*.png` пропущено. Процес і перевірки — у [README.md](README.md).',
        '',
        `Усього: ${fresh.length} штампів.`,
    ];

    const counters = new Map<string, number>();

    for (const sheet of sheetsOf(fresh)) {
        const key = `${sheet.biome}-${sheet.priority}`;
        const n = (counters.get(key) ?? 0) + 1;

        counters.set(key, n);

        parts.push(
            '',
            `## ${BIOME_TITLE[sheet.biome]} · P${sheet.priority} · аркуш ${n}`,
            '',
            '| # | Файл | Назва | Шар | Клітинок |',
            '| --- | --- | --- | --- | --- |',
            ...sheet.rows.map(
                (r, i) =>
                    `| ${i + 1} | \`${r.file}\` | ${r.name} | ${r.layer} | ${r.cols}x${r.rows} |`
            ),
            '',
            '```',
            sheetPrompt(sheet),
            '```'
        );
    }

    return `${parts.join('\n')}\n`;
}
