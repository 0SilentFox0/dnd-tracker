import fs from 'node:fs';
import path from 'node:path';

import {
    importSpecs,
    resolveSpec,
    ROOT,
} from '../../lib/__tests__/helpers/static-graph';

export const BASELINE_FILE = 'import-cycles-baseline.json';

const SCAN_DIRS = ['app', 'components', 'lib', 'systems', 'scripts', 'types'];

const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

export type Graph = Map<string, string[]>;

export function importsOf(file: string, source: string): string[] {
    return importSpecs(source)
        .map((spec) => resolveSpec(file, spec))
        .filter((f): f is string => !!f)
        .map((f) => path.relative(ROOT, f));
}

function listSources(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);

        if (e.isDirectory())
            return SKIP_DIRS.has(e.name) ? [] : listSources(full);

        return /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')
            ? [full]
            : [];
    });
}

export function scanGraph(): Graph {
    const graph: Graph = new Map();

    for (const dir of SCAN_DIRS)
        for (const file of listSources(path.join(ROOT, dir)))
            graph.set(
                path.relative(ROOT, file),
                importsOf(file, fs.readFileSync(file, 'utf8'))
            );

    return graph;
}

/** Tarjan; components of size > 1 (or a self-import), each sorted, list sorted. */
export function findSccs(graph: Graph): string[][] {
    const index = new Map<string, number>();

    const low = new Map<string, number>();

    const onStack = new Set<string>();

    const stack: string[] = [];

    const result: string[][] = [];

    let counter = 0;

    const strongConnect = (root: string) => {
        const work: { node: string; i: number }[] = [{ node: root, i: 0 }];

        index.set(root, counter);
        low.set(root, counter++);
        stack.push(root);
        onStack.add(root);

        while (work.length) {
            const frame = work[work.length - 1];

            const edges = graph.get(frame.node) ?? [];

            if (frame.i < edges.length) {
                const next = edges[frame.i++];

                if (!graph.has(next)) continue;

                if (!index.has(next)) {
                    index.set(next, counter);
                    low.set(next, counter++);
                    stack.push(next);
                    onStack.add(next);
                    work.push({ node: next, i: 0 });
                } else if (onStack.has(next)) {
                    low.set(
                        frame.node,
                        Math.min(
                            low.get(frame.node) as number,
                            index.get(next) as number
                        )
                    );
                }

                continue;
            }

            work.pop();

            const parent = work[work.length - 1];

            if (parent)
                low.set(
                    parent.node,
                    Math.min(
                        low.get(parent.node) as number,
                        low.get(frame.node) as number
                    )
                );

            if (low.get(frame.node) === index.get(frame.node)) {
                const scc: string[] = [];

                let n: string;

                do {
                    n = stack.pop() as string;
                    onStack.delete(n);
                    scc.push(n);
                } while (n !== frame.node);

                if (scc.length > 1 || graph.get(scc[0])?.includes(scc[0]))
                    result.push(scc.sort());
            }
        }
    };

    for (const node of graph.keys()) if (!index.has(node)) strongConnect(node);

    return result.sort((a, b) => a[0].localeCompare(b[0]));
}

export const formatSccs = (sccs: string[][]) =>
    sccs.map((scc) => scc.join(' | ')).sort();

export const currentCycles = () => formatSccs(findSccs(scanGraph()));

export function diffBaseline(found: string[], baseline: string[]) {
    return {
        added: found.filter((c) => !baseline.includes(c)),
        removed: baseline.filter((c) => !found.includes(c)),
    };
}

export const readBaseline = (): string[] =>
    JSON.parse(fs.readFileSync(path.join(ROOT, BASELINE_FILE), 'utf8'));

function main() {
    const start = Date.now();

    const found = currentCycles();

    const secs = ((Date.now() - start) / 1000).toFixed(1);

    if (process.argv.includes('--write')) {
        fs.writeFileSync(
            path.join(ROOT, BASELINE_FILE),
            JSON.stringify(found, null, 4) + '\n'
        );
        console.log(`baseline written: ${found.length} SCC (${secs}s)`);

        return;
    }

    const { added, removed } = diffBaseline(found, readBaseline());

    console.log(`${found.length} SCC (${secs}s)`);

    if (added.length) console.error('new/changed cycles:\n' + added.join('\n'));

    if (removed.length)
        console.error(
            'cycles gone or changed, shrink the baseline (pnpm cycles --write):\n' +
                removed.join('\n')
        );

    if (added.length || removed.length) process.exit(1);
}

if (process.argv[1]?.endsWith('cycles.ts')) main();
