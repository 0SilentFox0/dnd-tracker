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
        lookup: 'lib/utils/abilities/registry/install.ts',
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

/** App `layout.tsx` files above an entry: they wrap the page, so their gates and roots count for it */
export function layoutsOf(entry: string): string[] {
    if (!entry.startsWith('app/') || !entry.endsWith('/page.tsx')) return [];

    const parts = path.dirname(entry).split('/');

    return parts.flatMap((_, i) => {
        const layout = `${parts.slice(0, i + 1).join('/')}/layout.tsx`;

        return fs.existsSync(path.join(ROOT, layout)) ? [layout] : [];
    });
}

/** Server closure stops at `'use client'` files; the browser instance is the union of the closures of every boundary reached. `wrap` is what the page's layouts bring (roots, gates) without their own lookups, which a barrel import makes look wider than they are */
export function sideClosures(entry: string, deps: Deps) {
    const server = closureOf(entry, deps, true);

    const client = { files: new Set<string>(), dynamic: new Set<string>() };

    const wrap = {
        server: { files: new Set<string>(), dynamic: new Set<string>() },
        client: { files: new Set<string>(), dynamic: new Set<string>() },
    };

    for (const boundary of server.boundaries) {
        const c = closureOf(boundary, deps);

        c.files.forEach((f) => client.files.add(f));
        c.dynamic.forEach((f) => client.dynamic.add(f));
    }

    for (const layout of layoutsOf(entry)) {
        const l = closureOf(layout, deps, true);

        l.files.forEach((f) => wrap.server.files.add(f));
        l.dynamic.forEach((f) => wrap.server.dynamic.add(f));

        for (const boundary of l.boundaries) {
            const c = closureOf(boundary, deps);

            c.files.forEach((f) => wrap.client.files.add(f));
            c.dynamic.forEach((f) => wrap.client.dynamic.add(f));
        }
    }

    return { server, client, wrap };
}

/** An entry that reaches a lookup must reach its install root on the same side (server or browser), statically or through an `import()` of that root; a server root never serves a client component */
export function unrooted(
    entries: readonly string[],
    pairs: readonly InstallPair[],
    deps: Deps
): string[] {
    return entries.flatMap((entry) => {
        const { server, client, wrap } = sideClosures(entry, deps);

        return pairs.flatMap(({ lookup, root, lazy, side = 'both' }) => {
            const out: string[] = [];

            if (
                side !== 'client' &&
                server.files.has(lookup) &&
                !server.files.has(root) &&
                !server.dynamic.has(root) &&
                !wrap.server.files.has(root)
            )
                out.push(`${entry} -> ${lookup} [server]`);

            if (
                side !== 'server' &&
                client.files.has(lookup) &&
                !client.files.has(root) &&
                !client.dynamic.has(root) &&
                !(lazy && client.files.has(lazy)) &&
                !wrap.client.files.has(root) &&
                !(lazy && wrap.client.files.has(lazy))
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
    walkEntries('app', /^(route\.ts|page\.tsx|layout\.tsx)$/);

export const scriptEntries = (): string[] =>
    walkEntries('scripts', /\.(ts|tsx|mts)$/).filter(
        (f) => !/\.test\./.test(f)
    );
