import { STAMP_BIOMES } from '@/lib/constants/map-art/stamps';

import type {
    StampBiome,
    StampBlocks,
    StampDef,
    StampLayer,
} from '@/lib/constants/map-art/stamp-types';

export interface StampRow {
    file: string;
    name: string;
    biome: StampBiome;
    category: string;
    layer: StampLayer;
    cols: number;
    rows: number;
    shadow: 'none' | 'soft' | 'hard';
    blocks: StampBlocks | null;
    sight: boolean;
    prompt: string;
    priority: 1 | 2;
}

const COLUMNS = [
    'file',
    'name',
    'biome',
    'category',
    'layer',
    'cols',
    'rows',
    'shadow',
    'blocks',
    'sight',
    'prompt',
    'priority',
] as const;

const LAYERS: readonly string[] = ['decal', 'object', 'canopy'];

const SHADOWS: readonly string[] = ['none', 'soft', 'hard'];

const LEGACY_FILE = /^tiles_(.+)\.png$/;

function splitRecords(text: string): { line: number; cells: string[] }[] {
    const records: { line: number; cells: string[] }[] = [];

    let cells: string[] = [];
    let cell = '';
    let quoted = false;
    let line = 1;
    let start = 1;

    const endCell = () => {
        cells.push(cell);
        cell = '';
    };

    const endRecord = () => {
        endCell();

        if (cells.length > 1 || cells[0] !== '')
            records.push({ line: start, cells });

        cells = [];
        start = line + 1;
    };

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else if (ch === '"') quoted = false;
            else {
                if (ch === '\n') line++;

                cell += ch;
            }
        } else if (ch === '"') quoted = true;
        else if (ch === ',') endCell();
        else if (ch === '\n') {
            endRecord();
            line++;
            start = line;
        } else if (ch !== '\r') cell += ch;
    }

    if (quoted) throw new Error(`Line ${start}: unterminated quote`);

    if (cell !== '' || cells.length) endRecord();

    return records;
}

export function parseBlocks(v: string): StampBlocks | null {
    if (v === '') return null;

    const m = /^(rect|ellipse):(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(v);

    if (!m) throw new Error(`Invalid blocks "${v}"`);

    const w = Number(m[2]);
    const h = Number(m[3]);

    if (!(w > 0) || !(h > 0)) throw new Error(`Invalid blocks "${v}"`);

    return { shape: m[1] as StampBlocks['shape'], w, h };
}

function positiveInt(v: string, field: string): number {
    const n = Number(v);

    if (!Number.isInteger(n) || n < 1)
        throw new Error(`Invalid ${field} "${v}"`);

    return n;
}

function toRow(cells: string[]): StampRow {
    const r = Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i] ?? '']));

    if (!r.file) throw new Error('Missing file');

    if (!STAMP_BIOMES.includes(r.biome as StampBiome))
        throw new Error(`Unknown biome "${r.biome}"`);

    if (!LAYERS.includes(r.layer)) throw new Error(`Unknown layer "${r.layer}"`);

    if (!SHADOWS.includes(r.shadow))
        throw new Error(`Unknown shadow "${r.shadow}"`);

    if (r.priority !== '1' && r.priority !== '2')
        throw new Error(`Invalid priority "${r.priority}"`);

    if (r.sight !== '' && r.sight !== '1')
        throw new Error(`Invalid sight "${r.sight}"`);

    return {
        file: r.file,
        name: r.name,
        biome: r.biome as StampBiome,
        category: r.category,
        layer: r.layer as StampLayer,
        cols: positiveInt(r.cols, 'cols'),
        rows: positiveInt(r.rows, 'rows'),
        shadow: r.shadow as StampRow['shadow'],
        blocks: parseBlocks(r.blocks),
        sight: r.sight === '1',
        prompt: r.prompt,
        priority: r.priority === '1' ? 1 : 2,
    };
}

export function parseStampsCsv(text: string): StampRow[] {
    const [header, ...body] = splitRecords(text);

    if (!header || header.cells.join(',') !== COLUMNS.join(','))
        throw new Error('Line 1: unexpected header');

    return body.map(({ line, cells }) => {
        try {
            return toRow(cells);
        } catch (e) {
            throw new Error(`Line ${line}: ${(e as Error).message}`);
        }
    });
}

export function rowToDef(row: StampRow): StampDef {
    const legacy = LEGACY_FILE.exec(row.file);
    const id = legacy ? legacy[1] : row.file.replace(/\.webp$/, '');

    return {
        id,
        biome: row.biome,
        category: row.category,
        nameKey: legacy
            ? `tileLabels.${id}`
            : `maps.editor.stamps.name.${id}`,
        file: legacy
            ? `/assets/battle-tiles/objects/${row.file}`
            : `/assets/map-stamps/${row.biome}/${id}.webp`,
        cols: row.cols,
        rows: row.rows,
        layer: row.layer,
        shadow: row.shadow,
        ...(row.blocks && { blocks: row.blocks }),
        ...(row.sight && { sight: true as const }),
        priority: row.priority,
    };
}

export function buildDefs(
    rows: readonly StampRow[],
    exists: (publicPath: string) => boolean
): StampDef[] {
    return rows.map(rowToDef).filter((d) => exists(d.file));
}

const str = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const num = (n: number) => String(n);

function renderDef(d: StampDef): string {
    const lines = [
        `id: ${str(d.id)},`,
        `biome: ${str(d.biome)},`,
        `category: ${str(d.category)},`,
        `nameKey: ${str(d.nameKey)},`,
        `file: ${str(d.file)},`,
        `cols: ${num(d.cols)},`,
        `rows: ${num(d.rows)},`,
        `layer: ${str(d.layer)},`,
        `shadow: ${str(d.shadow)},`,
        ...(d.blocks
            ? [
                  `blocks: { shape: ${str(d.blocks.shape)}, w: ${num(d.blocks.w)}, h: ${num(d.blocks.h)} },`,
              ]
            : []),
        ...(d.sight ? ['sight: true,'] : []),
        `priority: ${num(d.priority)},`,
    ];

    return `    {\n${lines.map((l) => `        ${l}`).join('\n')}\n    },`;
}

export function renderStampsData(defs: readonly StampDef[]): string {
    const body = defs.length ? `\n${defs.map(renderDef).join('\n')}\n` : '';

    return `import type { StampDef } from './stamp-types';

export const STAMP_DATA: readonly StampDef[] = [${body}];
`;
}
