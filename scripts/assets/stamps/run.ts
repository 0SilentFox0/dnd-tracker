import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';

import { parseStampsCsv, rowToDef } from './csv';
import { renderStampsMd, sheetsOf } from './prompts';
import { sliceSheet } from './slice';
import { validateStampAsset, validateStampBytes } from './validate';

import type { StampBiome } from '@/lib/constants/map-art/stamp-types';
import type { StampRow } from './csv';

const ROOT = process.cwd();

const CSV = join(ROOT, 'docs/assets/stamp-prompts/stamps.csv');

const MD = join(ROOT, 'docs/assets/stamp-prompts/stamps.md');

const ASSETS = join(ROOT, 'public/assets/map-stamps');

const LEGACY = /^tiles_.+\.png$/;

const loadRows = () => parseStampsCsv(readFileSync(CSV, 'utf8'));

const idOf = (row: StampRow) => rowToDef(row).id;

const flag = (args: string[], name: string) => {
    const i = args.indexOf(name);

    return i < 0 ? undefined : args[i + 1];
};

function walk(dir: string): string[] {
    if (!existsSync(dir)) return [];

    return readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);

        return statSync(p).isDirectory() ? walk(p) : [p];
    });
}

async function validateAll(dir: string): Promise<number> {
    const rows = loadRows();
    const byKey = new Map(rows.map((r) => [`${r.biome}/${idOf(r)}`, r]));
    const seen = new Map<string, string>();
    let failed = 0;

    for (const file of walk(dir).filter((f) => !f.endsWith('.DS_Store'))) {
        const biome = basename(join(file, '..'));
        const id = basename(file).replace(/\.[^.]+$/, '');
        const errors = await validateStampAsset(
            file,
            byKey.get(`${biome}/${id}`),
            seen
        );

        if (errors.length) {
            failed++;
            console.error(
                `FAIL ${biome}/${basename(file)}: ${errors.join(', ')}`
            );
        } else console.log(`ok   ${biome}/${basename(file)}`);
    }

    return failed;
}

async function slice(args: string[]): Promise<number> {
    const [sheetFile] = args;
    const biome = flag(args, '--biome') as StampBiome | undefined;
    const priority = Number(flag(args, '--priority'));
    const n = Number(flag(args, '--sheet') ?? 1);
    const map = flag(args, '--map')?.split(',').map(Number);
    const write = args.includes('--write');

    if (!sheetFile || !biome || (priority !== 1 && priority !== 2))
        throw new Error(
            'usage: slice <sheet.png> --biome <b> --priority <1|2> --sheet <n> [--map 2,0,1,...] [--write]'
        );

    const sheet = sheetsOf(
        loadRows().filter((r) => !LEGACY.test(r.file))
    ).filter((s) => s.biome === biome && s.priority === priority)[n - 1];

    if (!sheet) throw new Error(`no sheet ${biome} P${priority} #${n}`);

    const parts = await sliceSheet(sheetFile, sheet.rows, map);
    const seen = new Map<string, string>();
    let failed = 0;

    for (const { row, webp } of parts) {
        const id = idOf(row);
        const errors = await validateStampBytes(webp, row, seen, id);

        if (errors.length) failed++;

        console.log(
            `${errors.length ? 'FAIL' : 'ok  '} ${biome}/${id}.webp ${webp.length} B ${errors.join(', ')}`
        );

        if (write) {
            const dir = join(ASSETS, biome);

            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, `${id}.webp`), webp);
        }
    }

    if (!write) console.log('dry run: pass --write to save files');

    return failed;
}

async function main(): Promise<number> {
    const [cmd, ...args] = process.argv.slice(2);

    if (cmd === 'prompts') {
        writeFileSync(MD, renderStampsMd(loadRows()));
        console.log(`wrote ${MD}`);

        return 0;
    }

    if (cmd === 'slice') return slice(args);

    if (cmd === 'validate') return validateAll(args[0] ?? ASSETS);

    if (cmd === 'build') {
        await import('./build');

        return 0;
    }

    console.error('usage: assets:stamps <prompts|slice|validate|build> ...');

    return 1;
}

main().then(
    (code) => process.exit(code ? 1 : 0),
    (e) => {
        console.error(e instanceof Error ? e.message : e);
        process.exit(1);
    }
);
