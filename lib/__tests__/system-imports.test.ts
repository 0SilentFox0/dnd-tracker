import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    importsSystem,
    isImportAllowed,
    readImportsExempt,
    ROOT,
    scanImporters,
    SYSTEM_ROOTS,
} from '@/scripts/shared/system-ratchet';

const BARREL = 'lib/utils/rules/systems/index.ts';

const BARREL_MAX_SYSTEM_IMPORT_LINES = 0;

const REASON = /^(route|content-kind|ruleset-section)$/;

const MAX_EXEMPT_FILES = 1;

describe('system imports ratchet', () => {
    const exempt = readImportsExempt();

    it('lists each file once with a known reason', () => {
        expect(new Set(exempt.map((e) => e.file)).size).toBe(exempt.length);
        expect(
            exempt.filter((e) => !REASON.test(e.reason)).map((e) => e.file)
        ).toEqual([]);
    });

    it('the list stays within the E1 target', () =>
        expect(exempt.length).toBeLessThanOrEqual(MAX_EXEMPT_FILES));

    it('every entry exists and still imports @/systems/ (lower the list)', () => {
        const stale = exempt.filter(
            (e) =>
                !fs.existsSync(path.join(ROOT, e.file)) ||
                !importsSystem(
                    fs.readFileSync(path.join(ROOT, e.file), 'utf8')
                ) ||
                isImportAllowed(e.file)
        );

        expect(stale.map((e) => e.file)).toEqual([]);
    });

    it('no file outside the list imports @/systems/ (new leak)', () => {
        const listed = new Set(exempt.map((e) => e.file));

        expect(scanImporters().filter((file) => !listed.has(file))).toEqual([]);
    });

    it('the rules barrel does not grow its @/systems/ re-exports (D69)', () => {
        const lines = fs
            .readFileSync(path.join(ROOT, BARREL), 'utf8')
            .split('\n')
            .filter((l) => l.includes('from "@/systems/')).length;

        expect(lines).toBeLessThanOrEqual(BARREL_MAX_SYSTEM_IMPORT_LINES);
    });

    it(
        'ESLint rejects a new importer and spares roots and exempt files',
        { timeout: 30_000 },
        async () => {
            const eslint = new ESLint({ cwd: ROOT });

            const lint = async (filePath: string) =>
                (
                    await eslint.lintText(
                        'import x from "@/systems/wfrp/rules";\nexport { x };\n',
                        { filePath }
                    )
                ).flatMap((r) =>
                    r.messages.filter((m) => m.ruleId === 'systems/zone')
                );

            expect(await lint('lib/utils/battle/foo.ts')).toHaveLength(1);
            expect(await lint(SYSTEM_ROOTS[0])).toEqual([]);

            for (const { file } of exempt) expect(await lint(file)).toEqual([]);
        }
    );
});
