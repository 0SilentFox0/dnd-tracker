import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { ROOT } from './helpers/static-graph';

const LOOKUP_FILES = [
    'lib/utils/rules/systems/lookup.ts',
    'lib/server/systems/lookup.ts',
];

const INSTALLERS = new Set(['installModules', 'installServerModules']);

const LOOKUPS = new Set(
    LOOKUP_FILES.flatMap((f) =>
        [
            ...fs
                .readFileSync(path.join(ROOT, f), 'utf8')
                .matchAll(/^export (?:const|function) (\w+)/gm),
        ].map((m) => m[1])
    ).filter((n) => !INSTALLERS.has(n) && !/^is\w*Installed$/.test(n))
);

const ROOT_IMPORT =
    /^import ['"]@\/(?:lib\/server\/systems|lib\/utils\/rules\/systems|components\/systems)\/registry['"];/m;

const ROOTS = new Set([
    'lib/utils/rules/systems/registry.ts',
    'lib/server/systems/registry.ts',
    'components/systems/registry.ts',
]);

const DIRS = ['lib', 'systems', 'components'];

const walk = (dir: string): string[] =>
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.join(dir, e.name);

        if (e.isDirectory())
            return e.name === '__tests__' || e.name === 'node_modules'
                ? []
                : walk(rel);

        return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [rel] : [];
    });

const topLevelCalls = (file: string): string[] => {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');

    if (ROOT_IMPORT.test(text)) return [];

    const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true
    );

    const hits: string[] = [];

    const visit = (node: ts.Node) => {
        if (ts.isFunctionLike(node) || ts.isClassLike(node)) return;

        if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            LOOKUPS.has(node.expression.text)
        )
            hits.push(
                `${file}:${source.getLineAndCharacterOfPosition(node.pos).line + 1} ${node.expression.text}`
            );

        ts.forEachChild(node, visit);
    };

    ts.forEachChild(source, visit);

    return hits;
};

describe('system lookups stay lazy at module level', () => {
    it('no module without a direct install-root import calls a lookup while evaluating', () => {
        const files = DIRS.flatMap(walk).filter(
            (f) => !ROOTS.has(f) && !/\/systems\/lookup\.ts$/.test(f)
        );

        expect(files.flatMap(topLevelCalls)).toEqual([]);
    });
});
