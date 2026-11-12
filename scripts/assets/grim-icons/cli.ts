#!/usr/bin/env tsx
// pnpm assets:grim-icons prompts [--out <dir>]   (upload: pnpm template icons grim-d100 --dir <images>)
import * as fs from 'fs';
import * as path from 'path';

import { readPack } from '../../templates/lib/pack';
import {
    WFRP_ROW_KINDS,
    wfrpDataOf,
} from '../../templates/systems/wfrp/common';
import {
    assertCleanPrompt,
    assertUniqueFiles,
    type PromptRow,
    toMarkdown,
} from '../icon-prompts/compose';
import {
    type GrimPromptRow,
    grimPromptRows,
    type GrimSubjects,
} from './prompts';

const USAGE =
    'Використання: pnpm assets:grim-icons prompts [--out <dir>]; завантаження іконок: pnpm template icons grim-d100 --dir <images> [--dry-run] [--allow-remote]';

const SUBJECTS_DIR = path.join(__dirname, '..', 'icon-subjects');

const DEFAULT_OUT = 'docs/assets/icon-prompts/grim-d100';

const readSubject = <T>(name: string) =>
    JSON.parse(
        fs.readFileSync(path.join(SUBJECTS_DIR, `grim-${name}.json`), 'utf8')
    ) as T;

const loadRows = (): GrimPromptRow[] => {
    const subjects: GrimSubjects = {
        units: readSubject('units'),
        spells: readSubject('spells'),
        artifacts: readSubject('artifacts'),
        identity: readSubject('identity'),
    };

    return grimPromptRows(wfrpDataOf(readPack('grim-d100')), subjects);
};

const flag = (args: string[], name: string) => {
    const i = args.indexOf(name);

    if (i < 0) return undefined;

    if (!args[i + 1] || args[i + 1].startsWith('--'))
        throw new Error(`${name} потребує значення. ${USAGE}`);

    return args[i + 1];
};

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

function writePrompts(out: string) {
    const rows = loadRows();

    const asPromptRows: PromptRow[] = rows.map((r) => ({
        file: r.file,
        name: r.name,
        kind: 'skills',
        prompt: r.prompt,
        group: r.kind,
    }));

    asPromptRows.forEach((r) => assertCleanPrompt(r));
    assertUniqueFiles(asPromptRows, 'grim-d100');

    fs.mkdirSync(out, { recursive: true });

    for (const kind of WFRP_ROW_KINDS) {
        const lines = rows
            .filter((r) => r.kind === kind)
            .map((r) =>
                [r.recordId, r.name, r.file, r.prompt].map(csvCell).join(',')
            );

        fs.writeFileSync(
            path.join(out, `${kind}.csv`),
            `record_id,name,output_filename,prompt\n${lines.join('\n')}\n`
        );
    }

    const intro =
        'Промпти для генерації іконок Grim d100. Зображення генерує `generate_grim.py` у `~/Downloads/fantasy-tokens` (вихід `output-grim/icons/<kind>/<файл>.png`, 768 px); `pnpm template icons grim-d100 --dir <images>` бере їх звідти. На зображеннях заборонений будь-який текст.';

    fs.writeFileSync(
        path.join(out, 'README.md'),
        toMarkdown('Іконки Grim d100', intro, asPromptRows)
    );

    console.info(`${rows.length} промптів у ${out}`);
}

async function main() {
    const [command, ...rest] = process.argv.slice(2);

    if (command === 'prompts')
        return writePrompts(flag(rest, '--out') ?? DEFAULT_OUT);

    throw new Error(USAGE);
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
});
