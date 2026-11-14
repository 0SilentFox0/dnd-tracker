import fs from 'node:fs';
import path from 'node:path';

import { importSpecs, resolveSpec, ROOT } from './static-graph';

export interface InstallPair {
    lookup: string;
    root: string;
}

export const INSTALL_PAIRS: InstallPair[] = [
    {
        lookup: 'lib/utils/rules/systems/lookup.ts',
        root: 'lib/utils/rules/systems/registry.ts',
    },
    {
        lookup: 'lib/server/systems/lookup.ts',
        root: 'lib/server/systems/registry.ts',
    },
].filter(({ lookup }) => fs.existsSync(path.join(ROOT, lookup)));

export type Deps = (file: string) => { files: string[]; dynamic: string[] };

const DYNAMIC_RE = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

export const fsDeps = (): Deps => {
    const cache = new Map<string, ReturnType<Deps>>();

    return (rel) => {
        const hit = cache.get(rel);

        if (hit) return hit;

        const abs = path.join(ROOT, rel);

        const source = fs.readFileSync(abs, 'utf8');

        const toRel = (spec: string) => {
            const local = resolveSpec(abs, spec);

            return local ? path.relative(ROOT, local) : null;
        };

        const made = {
            files: importSpecs(source).flatMap((s) => toRel(s) ?? []),
            dynamic: [...source.matchAll(DYNAMIC_RE)].flatMap(
                (m) => toRel(m[1]) ?? []
            ),
        };

        cache.set(rel, made);

        return made;
    };
};

/** Static closure of `entry`; `dynamic` collects `import()` targets met on the way */
export function closureOf(entry: string, deps: Deps) {
    const files = new Set<string>();

    const dynamic = new Set<string>();

    const queue = [entry];

    while (queue.length) {
        const file = queue.shift() as string;

        if (files.has(file)) continue;

        files.add(file);

        const d = deps(file);

        queue.push(...d.files);
        d.dynamic.forEach((t) => dynamic.add(t));
    }

    return { files, dynamic };
}

/** An entry that reaches a lookup must reach its install root statically, or through an `import()` of that root */
export function unrooted(
    entries: readonly string[],
    pairs: readonly InstallPair[],
    deps: Deps
): string[] {
    return entries.flatMap((entry) => {
        const { files, dynamic } = closureOf(entry, deps);

        return pairs
            .filter(
                ({ lookup, root }) =>
                    files.has(lookup) && !files.has(root) && !dynamic.has(root)
            )
            .map(({ lookup }) => `${entry} -> ${lookup}`);
    });
}

export function appEntries(): string[] {
    const out: string[] = [];

    const walk = (dir: string) => {
        for (const e of fs.readdirSync(path.join(ROOT, dir), {
            withFileTypes: true,
        })) {
            const rel = path.join(dir, e.name);

            if (e.isDirectory()) {
                if (e.name !== '__tests__') walk(rel);
            } else if (/^(route\.ts|page\.tsx)$/.test(e.name)) out.push(rel);
        }
    };

    walk('app');

    return out.sort();
}
