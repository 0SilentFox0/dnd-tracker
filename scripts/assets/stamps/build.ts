import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildDefs, parseStampsCsv, renderStampsData } from './csv';

const ROOT = process.cwd();

const CSV = join(ROOT, 'docs/assets/stamp-prompts/stamps.csv');

const OUT = join(ROOT, 'lib/constants/map-art/stamps-data.ts');

const rows = parseStampsCsv(readFileSync(CSV, 'utf8'));

const next = renderStampsData(
    buildDefs(rows, (file) => existsSync(join(ROOT, 'public', file)))
);

if (process.argv.includes('--check')) {
    if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== next) {
        console.error('stamps-data.ts is out of date: run the build script');
        process.exit(1);
    }
} else {
    writeFileSync(OUT, next);
    console.log(`stamps-data.ts: ${rows.length} rows`);
}
