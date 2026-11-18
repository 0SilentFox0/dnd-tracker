// node scripts/shared/raw-controls-baseline.mjs [--write]: raw-controls-exempt.json = files that still hold raw controls (only shrinks)
import { readFileSync, writeFileSync } from 'node:fs';
import { ESLint } from 'eslint';
import typescriptParser from '@typescript-eslint/parser';
import {
    RAW_CONTROL_FILES,
    RAW_CONTROL_IGNORES,
    rawControlsPlugin,
} from '../../eslint/raw-controls.mjs';

const FILE = 'raw-controls-exempt.json';
const root = new URL('../../', import.meta.url).pathname;

const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [
        {
            files: RAW_CONTROL_FILES,
            ignores: RAW_CONTROL_IGNORES,
            languageOptions: {
                parser: typescriptParser,
                parserOptions: { ecmaFeatures: { jsx: true } },
            },
            plugins: { 'raw-controls': rawControlsPlugin },
            rules: { 'raw-controls/no-raw-control': 'error' },
        },
    ],
});

const results = await eslint.lintFiles(RAW_CONTROL_FILES);

const current = results
    .filter((r) => r.messages.length > 0)
    .map((r) => ({
        file: r.filePath.slice(root.length),
        count: r.messages.length,
    }))
    .sort((a, b) => a.file.localeCompare(b.file));

if (process.argv.includes('--write')) {
    writeFileSync(FILE, JSON.stringify(current, null, 4) + '\n');
    console.log(`${FILE}: ${current.length} files`);
} else {
    const known = new Map(
        JSON.parse(readFileSync(FILE, 'utf8')).map((e) => [e.file, e.count])
    );
    const bad = current.filter((e) => (known.get(e.file) ?? 0) < e.count);

    bad.forEach((e) => console.error(`raw controls grew: ${e.file}`));
    process.exit(bad.length ? 1 : 0);
}
