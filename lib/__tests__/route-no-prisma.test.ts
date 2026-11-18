import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ROOT } from './helpers/static-graph';

const API_DIR = path.join(ROOT, 'app/api');

const ALLOWED = new Set(['app/api/health/route.ts']);

function routeFiles(dir: string): string[] {
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) =>
            e.isDirectory()
                ? e.name === '__tests__'
                    ? []
                    : routeFiles(path.join(dir, e.name))
                : e.name === 'route.ts'
                  ? [path.join(dir, e.name)]
                  : []
        );
}

describe('route.ts stays thin', () => {
    it('does not import prisma directly (health is the only exception)', () => {
        const offenders = routeFiles(API_DIR)
            .map((f) => path.relative(ROOT, f))
            .filter((f) => !ALLOWED.has(f))
            .filter((f) =>
                /from '@\/lib\/db'|\bprisma\./.test(
                    fs.readFileSync(path.join(ROOT, f), 'utf8')
                )
            );

        expect(offenders).toEqual([]);
    });
});
