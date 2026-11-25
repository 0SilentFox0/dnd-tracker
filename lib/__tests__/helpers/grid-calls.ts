import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { ROOT } from './static-graph';

export const ARITY: Record<string, number> = {
    cellsOf: 2,
    footprint: 3,
    footprintDistance: 3,
    cellDistance: 3,
    neighbors: 2,
    cellLine: 3,
    cellsByRing: 3,
    cellsByDistance: 3,
    closestCell: 3,
    isAdjacent: 3,
    aimInRange: 5,
    pointBlankBetween: 4,
    occupiedBy: 3,
    nearestTo: 3,
    centreCell: 2,
    apexOf: 3,
    areaCentre: 2,
    templateCentre: 4,
    templateAimAllowed: 6,
    participantsInCells: 4,
    awayStep: 3,
    tokenBox: 2,
    cellCenter: 2,
    cellPolygon: 2,
};

const GRID_MODULE =
    /^(?:@\/lib\/utils\/battle\/grid(?:\/(?:geometry|occupancy|template|nearest|push|map-scene|layout))?|\.\/(?:geometry|occupancy|template|nearest|push|map-scene|layout))$/;

const RANGE_BAND_MODULE = /range-band$/;

const LAYOUT_MODULE =
    /^(?:@\/lib\/utils\/battle\/grid(?:\/layout)?|\.\/layout)$/;

export const SCAN_DIRS = [
    'lib/utils/battle',
    'lib/utils/abilities',
    'lib/server/battles',
    'lib/hooks/battle',
    'components/battle/map',
];

export const SYSTEM_SUBDIRS = ['rules', 'server'];

export type Violation = {
    line: number;
    kind: 'arity' | 'ref' | 'size' | 'literal' | 'unit';
    text: string;
};

const walk = (dir: string): string[] => {
    const abs = path.join(ROOT, dir);

    if (!fs.existsSync(abs)) return [];

    return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
        const rel = path.join(dir, e.name);

        if (e.isDirectory())
            return e.name === '__tests__' || e.name === 'node_modules'
                ? []
                : walk(rel);

        return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [rel] : [];
    });
};

export const scannedFiles = (): string[] => {
    const systems = fs
        .readdirSync(path.join(ROOT, 'systems'), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .flatMap((e) => SYSTEM_SUBDIRS.map((s) => `systems/${e.name}/${s}`));

    return [...SCAN_DIRS, ...systems].flatMap(walk).sort();
};

const importedNames = (
    source: ts.SourceFile,
    matches: (spec: string, name: string) => boolean
) => {
    const names = new Map<string, string>();

    for (const st of source.statements) {
        if (
            !ts.isImportDeclaration(st) ||
            !ts.isStringLiteral(st.moduleSpecifier)
        )
            continue;

        const bound = st.importClause?.namedBindings;

        if (!bound || !ts.isNamedImports(bound)) continue;

        for (const el of bound.elements) {
            const imported = (el.propertyName ?? el.name).text;

            if (matches(st.moduleSpecifier.text, imported))
                names.set(el.name.text, imported);
        }
    }

    return names;
};

const isSizeOfCall = (n: ts.Node, sizeNames: Set<string>): boolean =>
    ts.isCallExpression(n) &&
    ts.isIdentifier(n.expression) &&
    sizeNames.has(n.expression.text);

const containsSizeOf = (n: ts.Node, sizeNames: Set<string>): boolean => {
    let hit = false;

    const visit = (c: ts.Node) => {
        if (hit) return;

        if (isSizeOfCall(c, sizeNames)) hit = true;
        else ts.forEachChild(c, visit);
    };

    visit(n);

    return hit;
};

export function scanGridCalls(file: string, text: string): Violation[] {
    const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true
    );

    const tracked = importedNames(
        source,
        (spec, name) =>
            name in ARITY &&
            (GRID_MODULE.test(spec) ||
                (name === 'pointBlankBetween' && RANGE_BAND_MODULE.test(spec)))
    );

    const sizeNames = new Set(
        importedNames(
            source,
            (spec, name) => name === 'sizeOf' && GRID_MODULE.test(spec)
        ).keys()
    );

    const inOccupancy = /(?:^|\/)occupancy\.ts$/.test(file);

    const out: Violation[] = [];

    const add = (n: ts.Node, kind: Violation['kind'], t: string) =>
        out.push({
            line: source.getLineAndCharacterOfPosition(n.getStart()).line + 1,
            kind,
            text: t,
        });

    const visit = (n: ts.Node) => {
        if (ts.isImportDeclaration(n)) return;

        if (ts.isIdentifier(n) && tracked.has(n.text)) {
            const parent = n.parent;

            const isCallee =
                ts.isCallExpression(parent) && parent.expression === n;

            const isDeclaration =
                (ts.isImportSpecifier(parent) ||
                    ts.isExportSpecifier(parent) ||
                    ts.isBindingElement(parent) ||
                    ts.isParameter(parent) ||
                    ts.isFunctionDeclaration(parent) ||
                    ts.isVariableDeclaration(parent)) &&
                (parent as { name?: ts.Node }).name === n;

            const isMemberName =
                (ts.isPropertyAccessExpression(parent) && parent.name === n) ||
                (ts.isPropertyAssignment(parent) && parent.name === n) ||
                (ts.isShorthandPropertyAssignment(parent) && false);

            const isTypeQuery = ts.isTypeQueryNode(parent);

            if (!isCallee && !isDeclaration && !isMemberName && !isTypeQuery)
                add(n, 'ref', `${tracked.get(n.text)} used point-free`);
        }

        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
            const name = tracked.get(n.expression.text);

            if (name) {
                const args = n.arguments;

                const hasSpread = args.some(ts.isSpreadElement);

                if (!hasSpread && args.length < ARITY[name])
                    add(
                        n,
                        'arity',
                        `${name} called with ${args.length} of ${ARITY[name]} args`
                    );

                if (
                    args.some(
                        (a) => ts.isStringLiteralLike(a) && a.text === 'square'
                    )
                )
                    add(n, 'literal', `${name} gets literal 'square' as grid`);

                if (
                    name === 'footprint' &&
                    !inOccupancy &&
                    args[1] &&
                    containsSizeOf(args[1], sizeNames)
                )
                    add(
                        n,
                        'size',
                        'footprint(_, sizeOf(..)) outside occupancy.ts'
                    );
            }
        }

        if (
            ts.isBinaryExpression(n) &&
            n.operatorToken.kind === ts.SyntaxKind.AsteriskToken &&
            !inOccupancy &&
            (isSizeOfCall(n.left, sizeNames) ||
                isSizeOfCall(n.right, sizeNames))
        )
            add(n, 'size', 'sizeOf(..) * outside occupancy.ts');

        ts.forEachChild(n, visit);
    };

    visit(source);

    return out;
}

export function scanRawUnit(file: string, text: string): Violation[] {
    if (/(?:^|\/)layout\.ts$/.test(file)) return [];

    const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true
    );

    const unit = [
        ...importedNames(
            source,
            (spec, name) => name === 'UNIT' && LAYOUT_MODULE.test(spec)
        ).keys(),
    ];

    if (unit.length === 0) return [];

    const out: Violation[] = [];

    const isUnit = (e: ts.Expression) =>
        ts.isIdentifier(e) && unit.includes(e.text);

    const visit = (n: ts.Node) => {
        if (
            ts.isBinaryExpression(n) &&
            n.operatorToken.kind === ts.SyntaxKind.AsteriskToken &&
            (isUnit(n.left) || isUnit(n.right))
        )
            out.push({
                line:
                    source.getLineAndCharacterOfPosition(n.getStart()).line + 1,
                kind: 'unit',
                text: 'raw * UNIT outside layout.ts',
            });

        ts.forEachChild(n, visit);
    };

    visit(source);

    return out;
}

export const UNIT_DIRS = ['components/battle/map', 'lib/utils/battle/grid'];

export const unitFiles = (): string[] => UNIT_DIRS.flatMap(walk).sort();
