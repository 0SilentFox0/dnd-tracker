import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { ROOT } from './helpers/static-graph';

const LOOKUP_FILES = [
    'lib/utils/rules/systems/lookup.ts',
    'lib/server/systems/lookup.ts',
    'components/systems/lookup.ts',
];

const INSTALLERS = new Set([
    'installModules',
    'installServerModules',
    'installUiModules',
]);

const EXPORTS = new Set(
    LOOKUP_FILES.flatMap((f) =>
        [
            ...fs
                .readFileSync(path.join(ROOT, f), 'utf8')
                .matchAll(/^export (?:const|function) (\w+)/gm),
        ].map((m) => m[1])
    ).filter((n) => !INSTALLERS.has(n) && !/^is\w*Installed$/.test(n))
);

const isProxyTable = (name: string) => /^[A-Z][A-Z_]+$/.test(name);

const ROOT_IMPORT =
    /^import ['"]@\/(?:lib\/server\/systems|lib\/utils\/rules\/systems|components\/systems)\/registry['"];/m;

const ROOTS = new Set([
    'lib/utils/rules/systems/registry.ts',
    'lib/server/systems/registry.ts',
    'components/systems/registry.ts',
]);

// scripts are entry files: their body runs after every import, the install-entries test covers their roots
const DIRS = ['lib', 'systems', 'components', 'app'];

const SYSTEMS_MODULE = /systems(?:\/lookup)?$/;

const walk = (dir: string): string[] =>
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.join(dir, e.name);

        if (e.isDirectory())
            return e.name === '__tests__' || e.name === 'node_modules'
                ? []
                : walk(rel);

        return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [rel] : [];
    });

/** Local names bound to a lookup export (aliases included) and namespace imports of a lookup module */
function bindings(source: ts.SourceFile) {
    const names = new Map<string, string>();

    const namespaces = new Set<string>();

    for (const st of source.statements) {
        if (
            !ts.isImportDeclaration(st) ||
            !ts.isStringLiteral(st.moduleSpecifier) ||
            !SYSTEMS_MODULE.test(st.moduleSpecifier.text)
        )
            continue;

        const bound = st.importClause?.namedBindings;

        if (bound && ts.isNamespaceImport(bound)) namespaces.add(bound.name.text);

        if (bound && ts.isNamedImports(bound))
            for (const el of bound.elements) {
                const imported = (el.propertyName ?? el.name).text;

                if (EXPORTS.has(imported)) names.set(el.name.text, imported);
            }
    }

    return { names, namespaces };
}

const calledName = (
    expr: ts.Expression,
    names: Map<string, string>,
    namespaces: Set<string>
): string | undefined => {
    if (ts.isIdentifier(expr)) return names.get(expr.text);

    if (
        ts.isPropertyAccessExpression(expr) &&
        ts.isIdentifier(expr.expression) &&
        namespaces.has(expr.expression.text) &&
        EXPORTS.has(expr.name.text)
    )
        return expr.name.text;

    return undefined;
};

/** A table read: `TABLE.x`, `TABLE[key]`, `ns.TABLE.x` */
const readName = (
    node: ts.Node,
    names: Map<string, string>,
    namespaces: Set<string>
): string | undefined => {
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node))
        return undefined;

    const name = calledName(node.expression, names, namespaces);

    return name && isProxyTable(name) ? name : undefined;
};

const topLevelCalls = (
    file: string,
    text = fs.readFileSync(path.join(ROOT, file), 'utf8')
): string[] => {
    if (ROOT_IMPORT.test(text)) return [];

    const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true
    );

    const { names, namespaces } = bindings(source);

    const touches = (node: ts.Node, localCallers: Set<string>): string | undefined => {
        if (ts.isCallExpression(node)) {
            const name = calledName(node.expression, names, namespaces);

            if (name && !isProxyTable(name)) return name;

            if (ts.isIdentifier(node.expression) && localCallers.has(node.expression.text))
                return node.expression.text;
        }

        return readName(node, names, namespaces);
    };

    const bodyOf = (node: ts.Node): ts.Node | undefined => {
        if (ts.isFunctionDeclaration(node) && node.name && node.body)
            return node;

        if (
            ts.isVariableStatement(node) &&
            node.declarationList.declarations.length === 1
        ) {
            const init = node.declarationList.declarations[0].initializer;

            if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)))
                return node;
        }

        return undefined;
    };

    const nameOf = (node: ts.Node): string =>
        ts.isFunctionDeclaration(node)
            ? (node.name as ts.Identifier).text
            : ((node as ts.VariableStatement).declarationList.declarations[0]
                  .name as ts.Identifier).text;

    const fnNodeOf = (st: ts.Node): ts.FunctionLikeDeclaration =>
        ts.isFunctionDeclaration(st)
            ? st
            : ((st as ts.VariableStatement).declarationList.declarations[0]
                  .initializer as ts.FunctionLikeDeclaration);

    /** Calls made while the function runs; nested functions only run later, so they are skipped */
    const anyTouch = (st: ts.Node, localCallers: Set<string>): boolean => {
        let hit = false;

        const visit = (n: ts.Node) => {
            if (hit || ts.isFunctionLike(n) || ts.isClassLike(n)) return;

            if (touches(n, localCallers)) hit = true;
            else ts.forEachChild(n, visit);
        };

        const body = fnNodeOf(st).body;

        if (body) visit(body);

        return hit;
    };

    const localCallers = new Set<string>();

    const functions = source.statements.filter((st) => bodyOf(st));

    for (let changed = true; changed; ) {
        changed = false;

        for (const fn of functions)
            if (!localCallers.has(nameOf(fn)) && anyTouch(fn, localCallers)) {
                localCallers.add(nameOf(fn));
                changed = true;
            }
    }

    const hits: string[] = [];

    const visit = (node: ts.Node) => {
        if (ts.isFunctionLike(node) || ts.isClassLike(node)) return;

        const name = touches(node, localCallers);

        if (name)
            hits.push(
                `${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1} ${name}`
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

        expect(files.flatMap((f) => topLevelCalls(f))).toEqual([]);
    });
});

describe('the top-level detector (fixtures)', () => {
    const hits = (body: string) => topLevelCalls('lib/x.ts', body).length;

    const IMPORT = "import { ruleSystemOf as rs, RULE_SYSTEM_REGISTRY as T } from '@/lib/utils/rules/systems';\n";

    it('catches a bare call, an alias and a namespace call', () => {
        expect(hits(IMPORT + 'export const a = rs(x);')).toBe(1);
        expect(
            hits(
                "import * as L from '@/lib/utils/rules/systems/lookup';\nexport const a = L.ruleSystemOf(x);"
            )
        ).toBe(1);
    });

    it('catches a read of the proxy table, not a bare reference', () => {
        expect(hits(IMPORT + 'export const a = T.d20;')).toBe(1);
        expect(hits(IMPORT + 'export const a = T[key];')).toBe(1);
        expect(hits(IMPORT + 'export const a = T;')).toBe(0);
    });

    it('catches a top-level call of a local function that reaches a lookup, not a deferred one', () => {
        expect(
            hits(IMPORT + 'const f = () => rs(x);\nexport const a = f();')
        ).toBe(1);
        expect(
            hits(IMPORT + 'const f = () => rs(x);\nexport const a = () => f();')
        ).toBe(0);
    });

    it('a direct install-root import silences the file', () => {
        expect(
            hits(
                "import '@/lib/utils/rules/systems/registry';\n" +
                    IMPORT +
                    'export const a = rs(x);'
            )
        ).toBe(0);
    });
});
