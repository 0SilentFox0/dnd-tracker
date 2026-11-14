import ts from 'typescript';

import { readSource,sources } from './source-files';

export const PROPS_LIMIT = 7;

export const PROPS_SCAN_DIRS = ['components', 'systems'] as const;

const UI_PRIMITIVES = /^components\/ui\//;

const inScope = (file: string) =>
    file.startsWith('components/')
        ? !UI_PRIMITIVES.test(file)
        : /^systems\/[^/]+\/ui\//.test(file);

const isExported = (node: ts.Node) =>
    ts.canHaveModifiers(node) &&
    !!ts
        .getModifiers(node)
        ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

const isComponentName = (name: string) => /^[A-Z]/.test(name);

export function countComponentProps(
    code: string,
    fileName = 'x.tsx'
): Record<string, number> {
    const sf = ts.createSourceFile(
        fileName,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
    );

    const types = new Map<string, ts.Node>();

    const locals = new Map<string, ts.SignatureDeclarationBase>();

    sf.forEachChild((n) => {
        if (ts.isFunctionDeclaration(n) && n.name)
            locals.set(n.name.text, n);

        if (ts.isVariableStatement(n))
            n.declarationList.declarations.forEach((d) => {
                if (
                    ts.isIdentifier(d.name) &&
                    d.initializer &&
                    (ts.isArrowFunction(d.initializer) ||
                        ts.isFunctionExpression(d.initializer))
                )
                    locals.set(d.name.text, d.initializer);
            });

        if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n))
            types.set(n.name.text, n);
    });

    const names = (
        node: ts.Node | undefined,
        seen = new Set<string>()
    ): Set<string> => {
        const out = new Set<string>();

        if (!node) return out;

        if (ts.isParenthesizedTypeNode(node)) return names(node.type, seen);

        if (ts.isTypeLiteralNode(node)) {
            node.members.forEach((m) => {
                if (m.name) out.add(m.name.getText(sf));
            });

            return out;
        }

        if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
            node.types.forEach((t) =>
                names(t, seen).forEach((x) => out.add(x))
            );

            return out;
        }

        if (ts.isTypeReferenceNode(node)) {
            const id = node.typeName.getText(sf);

            const args = node.typeArguments;

            if (/^(Readonly|Partial|Required)$/.test(id) && args)
                return names(args[0], seen);

            if (/^(Omit|Pick)$/.test(id) && args)
                return names(args[0], seen);

            const decl = types.get(id);

            if (!decl || seen.has(id)) return out;

            seen.add(id);

            if (ts.isTypeAliasDeclaration(decl))
                return names(decl.type, seen);

            if (ts.isInterfaceDeclaration(decl)) {
                decl.members.forEach((m) => {
                    if (m.name) out.add(m.name.getText(sf));
                });
                decl.heritageClauses?.forEach((h) =>
                    h.types.forEach((t) =>
                        names(
                            ts.factory.createTypeReferenceNode(
                                t.expression.getText(sf)
                            ),
                            seen
                        ).forEach((x) => out.add(x))
                    )
                );
            }
        }

        return out;
    };

    const fromParam = (p: ts.ParameterDeclaration | undefined) => {
        if (!p) return 0;

        const fromType = names(p.type);

        if (fromType.size) return fromType.size;

        return ts.isObjectBindingPattern(p.name)
            ? p.name.elements.filter((e) => !e.dotDotDotToken).length
            : 0;
    };

    const result: Record<string, number> = {};

    const handleFn = (
        name: string,
        fn: ts.SignatureDeclarationBase,
        typeArg?: ts.TypeNode
    ) => {
        if (!isComponentName(name)) return;

        const count = typeArg ? names(typeArg).size : fromParam(fn.parameters[0]);

        if (count) result[name] = count;
    };

    const unwrap = (
        init: ts.Expression
    ): { fn?: ts.SignatureDeclarationBase; typeArg?: ts.TypeNode } => {
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init))
            return { fn: init };

        if (ts.isIdentifier(init)) return { fn: locals.get(init.text) };

        if (ts.isCallExpression(init)) {
            const callee = init.expression.getText(sf);

            if (/(^|\.)(memo|forwardRef)$/.test(callee)) {
                const inner = init.arguments[0] && unwrap(init.arguments[0]);

                const typeArg =
                    callee.endsWith('forwardRef') && init.typeArguments?.[1]
                        ? init.typeArguments[1]
                        : callee.endsWith('memo')
                          ? init.typeArguments?.[0]
                          : undefined;

                return { fn: inner?.fn, typeArg: typeArg ?? inner?.typeArg };
            }
        }

        return {};
    };

    sf.forEachChild((n) => {
        if (ts.isFunctionDeclaration(n) && n.name && isExported(n))
            handleFn(n.name.text, n);

        if (ts.isVariableStatement(n) && isExported(n))
            n.declarationList.declarations.forEach((d) => {
                if (!ts.isIdentifier(d.name) || !d.initializer) return;

                const { fn, typeArg } = unwrap(d.initializer);

                if (fn) handleFn(d.name.text, fn, typeArg);
            });
    });

    return result;
}

export function collectPropsCounts(): Record<string, number> {
    const out: Record<string, number> = {};

    for (const dir of PROPS_SCAN_DIRS)
        for (const file of sources(dir)) {
            const rel = file.replace(/\\/g, '/');

            if (!inScope(rel) || !rel.endsWith('.tsx')) continue;

            for (const [name, n] of Object.entries(
                countComponentProps(readSource(rel), rel)
            ))
                out[`${rel}#${name}`] = n;
        }

    return out;
}

export function overBudget(counts: Record<string, number>) {
    return Object.fromEntries(
        Object.entries(counts).filter(([, n]) => n > PROPS_LIMIT)
    );
}
