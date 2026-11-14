import fs from 'node:fs';
import path from 'node:path';

import { importSpecs, resolveSpec, ROOT } from './static-graph';

export interface InstallPair {
    lookup: string;
    root: string;
    /** A client page may instead reach the lazy installer (`SystemGate` -> `loadSystems`) */
    lazy?: string;
    /** Where the lookup is read: RSC/route handlers and the browser are separate module instances */
    side?: 'server' | 'client' | 'both';
}

const CLIENT_INSTALL = 'components/systems/install.ts';

const PAIRS: InstallPair[] = [
    {
        lookup: 'lib/utils/rules/systems/lookup.ts',
        root: 'lib/utils/rules/systems/registry.ts',
        lazy: CLIENT_INSTALL,
    },
    {
        lookup: 'components/systems/lookup.ts',
        root: 'components/systems/registry.ts',
        lazy: CLIENT_INSTALL,
        side: 'client',
    },
    {
        lookup: 'lib/server/systems/lookup.ts',
        root: 'lib/server/systems/registry.ts',
        side: 'server',
    },
];

export const INSTALL_PAIRS = PAIRS.filter(({ lookup }) =>
    fs.existsSync(path.join(ROOT, lookup))
);

export type Deps = (file: string) => {
    files: string[];
    dynamic: string[];
    client?: boolean;
};

const USE_CLIENT_RE = /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/;

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
            client: USE_CLIENT_RE.test(source),
            files: importSpecs(source).flatMap((s) => toRel(s) ?? []),
            dynamic: [...source.matchAll(DYNAMIC_RE)].flatMap(
                (m) => toRel(m[1]) ?? []
            ),
        };

        cache.set(rel, made);

        return made;
    };
};

/** Static closure of `entry`; `dynamic` collects `import()` targets met on the way, `boundaries` the `'use client'` files met when `stopAtClient` */
export function closureOf(entry: string, deps: Deps, stopAtClient = false) {
    const files = new Set<string>();

    const dynamic = new Set<string>();

    const boundaries = new Set<string>();

    const queue = [entry];

    while (queue.length) {
        const file = queue.shift() as string;

        if (files.has(file)) continue;

        files.add(file);

        const d = deps(file);

        if (stopAtClient && d.client) {
            boundaries.add(file);
            continue;
        }

        queue.push(...d.files);
        d.dynamic.forEach((t) => dynamic.add(t));
    }

    return { files, dynamic, boundaries };
}

/** Server closure stops at `'use client'` files; the browser instance is the union of the closures of every boundary reached */
export function sideClosures(entry: string, deps: Deps) {
    const server = closureOf(entry, deps, true);

    const client = { files: new Set<string>(), dynamic: new Set<string>() };

    for (const boundary of server.boundaries) {
        const c = closureOf(boundary, deps);

        c.files.forEach((f) => client.files.add(f));
        c.dynamic.forEach((f) => client.dynamic.add(f));
    }

    return { server, client };
}

/** An entry that reaches a lookup must reach its install root on the same side (server or browser), statically or through an `import()` of that root; a server root never serves a client component */
export function unrooted(
    entries: readonly string[],
    pairs: readonly InstallPair[],
    deps: Deps
): string[] {
    return entries.flatMap((entry) => {
        const { server, client } = sideClosures(entry, deps);

        return pairs.flatMap(({ lookup, root, lazy, side = 'both' }) => {
            const out: string[] = [];

            if (
                side !== 'client' &&
                server.files.has(lookup) &&
                !server.files.has(root) &&
                !server.dynamic.has(root)
            )
                out.push(`${entry} -> ${lookup} [server]`);

            if (
                side !== 'server' &&
                client.files.has(lookup) &&
                !client.files.has(root) &&
                !client.dynamic.has(root) &&
                !(lazy && client.files.has(lazy))
            )
                out.push(`${entry} -> ${lookup} [client]`);

            return out;
        });
    });
}

const walkEntries = (dir: string, match: RegExp): string[] =>
    fs
        .readdirSync(path.join(ROOT, dir), { withFileTypes: true })
        .flatMap((e) => {
            const rel = path.join(dir, e.name);

            if (e.isDirectory())
                return e.name === '__tests__' || e.name === 'node_modules'
                    ? []
                    : walkEntries(rel, match);

            return match.test(e.name) ? [rel] : [];
        })
        .sort();

export const appEntries = (): string[] =>
    walkEntries('app', /^(route\.ts|page\.tsx)$/);

export const scriptEntries = (): string[] =>
    walkEntries('scripts', /\.(ts|tsx|mts)$/).filter(
        (f) => !/\.test\./.test(f)
    );
