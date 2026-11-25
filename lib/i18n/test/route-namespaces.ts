import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const ROOT = process.cwd();

const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');

const exists = (f: string) => existsSync(join(ROOT, f));

const NS = readdirSync(join(ROOT, 'messages/uk'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort();

const NSSET = new Set(NS);

type J = Record<string, unknown>;

const isObj = (v: unknown): v is J => typeof v === 'object' && v !== null && !Array.isArray(v);

const ukMsgs: Record<string, J> = {};

for (const ns of NS) ukMsgs[ns] = JSON.parse(read(`messages/uk/${ns}.json`));

const resolvesPath = (ns: string, path: string[]): boolean => {
    let cur: unknown = ukMsgs[ns];

    for (const seg of path) {
        if (!isObj(cur) || !(seg in cur)) return false;

        cur = cur[seg];
    }

    return true;
};

// ---------- source parsing ----------
const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

const resolveFile = (spec: string): string | undefined => {
    const base = normalize(spec);

    return [...EXTS.map((e) => base + e), base].find((p) => /\.tsx?$/.test(p) && exists(p) && statSync(join(ROOT, p)).isFile());
};

const TYPE_IMPORT = /(?:import|export)\s+type\s[^;"']*?from\s*["'][^"']+["'];?/g;

const ALL_TYPE_INLINE = /import\s*\{([^}]*)\}\s*from\s*["'][^"']+["'];?/g;


const USE_CLIENT = /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*["']use client["']/;

export interface Use { ns: string; sub: string; how: 'hook' | 'server' | 'literal' | 'template'; syncServerHook?: boolean }
interface Edge { target: string; names: string[] | null }
interface Info {
    text: string;
    useClient: boolean;
    serverOnly: boolean;
    imports: string[];
    edges: Edge[];
    barrel: boolean;
    uses: Use[];
    dynamic: { call: string; arg: string }[];
    rootCalls: string[];
    scope: { lit: string[]; battle: boolean; slots: string[]; rulesForm: boolean; log: boolean };
    tourLike: boolean;
}
export const cache = new Map<string, Info>();

function callArgs(text: string, start: number): string | null {
    let depth = 0;

    let i = start;

    for (; i < text.length; i++) {
        const c = text[i];

        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') {
            depth--;

            if (depth === 0) return text.slice(start + 1, i);
        }

        if (i - start > 600) return null;
    }

    return null;
}

const splitTop = (s: string): string[] => {
    const out: string[] = [];

    let d = 0, cur = '', q = '';

    for (const c of s) {
        if (q) { cur += c;

 if (c === q) q = '';

 continue; }

        if (c === '"' || c === "'" || c === '`') { q = c; cur += c; continue; }

        if ('([{'.includes(c)) d++;

        if (')]}'.includes(c)) d--;

        if (c === ',' && d === 0) { out.push(cur); cur = ''; } else cur += c;
    }

    if (cur.trim()) out.push(cur);

    return out;
};

const STR = /^\s*(["'`])([\w.]*)\1\s*$/;

export const REEXPORTS = new Map<string, { target: string; star: boolean; map: string[] }[]>();
export function parse(file: string, from?: string): Info {
    const reexports: { target: string; star: boolean; map: string[] }[] = [];

    const hit = cache.get(file);

    if (hit) return hit;

    const text = read(file);

    const stripped = text.replace(TYPE_IMPORT, '').replace(ALL_TYPE_INLINE, (m, inner: string) => {
        const items = inner.split(',').map((s) => s.trim()).filter(Boolean);

        return items.length && items.every((s) => s.startsWith('type ')) ? '' : m;
    });

    const imports: string[] = [];

    const edges: Edge[] = [];

    const resolveSpec = (spec: string) => {
        const abs = spec.startsWith('@/') ? spec.slice(2) : join(dirname(file), spec);

        return resolveFile(abs);
    };

    const noComments = stripped.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    const parseNames = (clause: string): string[] | null => {
        const c = clause.trim();

        if (c.startsWith('*') || !c) return null;

        const out: string[] = [];

        const def = /^([\w$]+)\s*(?:,|$)/.exec(c);

        if (def) out.push('default');

        const br = /\{([^}]*)\}/.exec(c);

        if (br) for (const part of br[1].split(',')) { const n = part.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, '');

 if (n) out.push(n); }

        if (/\*\s*as\s/.test(c)) return null;

        return out;
    };

    const stmtRe = /(import|export)\s+([^;"']*?)\s*from\s*["'](@\/[^"']+|\.{1,2}\/[^"']*)["']/g;

    let rest = noComments;

    for (const m of noComments.matchAll(stmtRe)) {
        const t = resolveSpec(m[3]);

        if (!t) continue;

        imports.push(t);

        if (m[1] === 'import') edges.push({ target: t, names: parseNames(m[2]) });
        else {
            // export-from: record re-export mapping; names = what this barrel provides
            const star = /^\*/.test(m[2].trim());

            const br = /\{([^}]*)\}/.exec(m[2]);

            const map: string[] = [];

            if (br) for (const part of br[1].split(',')) { const [orig, exp] = part.trim().split(/\s+as\s+/);

 if (orig) map.push(`${exp ?? orig}=${orig.replace(/^type\s+/, '')}`); }

            reexports.push({ target: t, star: star && !/\*\s*as\s/.test(m[2]), map });

            if (/\*\s*as\s/.test(m[2])) reexports[reexports.length - 1].map.push('*=*');
        }
    }
    for (const m of noComments.matchAll(/(?:import\s*\(\s*|import\s+)["'](@\/[^"']+|\.{1,2}\/[^"']*)["']/g)) {
        const t = resolveSpec(m[1]);

        if (t) { imports.push(t); edges.push({ target: t, names: null }); }
    }
    rest = noComments.replace(/(?:import|export)\s+[^;]*?from\s*["'][^"']+["'];?/g, '').replace(/(?:import|export)\s*(?:\(\s*)?["'][^"']+["']\)?;?/g, '').trim();

    const barrel = reexports.length > 0 && rest === '';

    const uses: Use[] = [];

    const dynamic: Info['dynamic'] = [];

    const rootCalls: string[] = [];

    const addNs = (full: string, how: Use['how']) => {
        const [ns, ...rest] = full.split('.');

        uses.push({ ns, sub: rest.join('.'), how });
    };

    const hookRe = /\b(useTranslations|useTranslator|getTranslations|getTranslator)\s*(?:<[^>(]*>)?\(/g;

    for (const m of text.matchAll(hookRe)) {
        const call = m[1];

        const args = callArgs(text, m.index! + m[0].length - 1);

        if (args === null) continue;

        const parts = splitTop(args);

        const server = call.startsWith('get');

        let arg: string | undefined;

        if (call === 'getTranslator') arg = parts[1];
        else if (call === 'getTranslations' && parts[0]?.includes('namespace')) arg = parts[0].replace(/^[\s\S]*namespace\s*:/, '');
        else arg = parts[0];

        if (arg === undefined || !arg.trim()) { rootCalls.push(call); continue; }

        const s = arg.trim().replace(/[}\s]+$/, '');

        const lit = STR.exec(s);

        if (lit) {
            if (NSSET.has(lit[2].split('.')[0])) addNs(lit[2], server ? 'server' : 'hook');
            else dynamic.push({ call, arg: `UNKNOWN-NS ${lit[2]}` });
        } else dynamic.push({ call, arg: s.slice(0, 80) });
    }

    // literal keys
    const litRe = /["'`]([A-Za-z][A-Za-z0-9]*)\.([A-Za-z0-9_.]*)(\$\{)?/g;

    const seenLit = new Set<string>();

    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

    for (const m of code.matchAll(litRe)) {
        const ns = m[1];

        if (!NSSET.has(ns)) continue;

        const rest = m[2];

        const tmpl = !!m[3];

        if (!rest && !tmpl) continue;

        const trailingDot = rest.endsWith('.');

        const segs = rest.split('.').filter(Boolean);

        const ok = resolvesPath(ns, segs) || ((tmpl || trailingDot) && resolvesPath(ns, segs));

        if (!ok) continue;

        const id = `${ns}.${rest}`;

        if (seenLit.has(id)) continue;

        seenLit.add(id);
        uses.push({ ns, sub: rest, how: tmpl ? 'template' : 'literal' });
    }

    const scope = { lit: [] as string[], battle: false, slots: [] as string[], rulesForm: false, log: false };

    if (/<ExtendLocaleScope/.test(text)) {
        for (const m of text.matchAll(/<ExtendLocaleScope\s+namespaces=\{\[([^\]]*)\]\}/g))
            for (const s of m[1].matchAll(/["'](\w+)["']/g)) scope.lit.push(s[1]);
        scope.battle = /BATTLE_NAMESPACES/.test(text);
        for (const m of text.matchAll(/system(?:Pack)?Scope\([\s\S]*?,\s*['"](\w+)['"]\s*\)/g)) scope.slots.push(m[1]);
        scope.rulesForm = /rulesFormScope\(/.test(text);
        scope.log = /logScope\(/.test(text);
    }

    const info: Info = {
        text, useClient: USE_CLIENT.test(text),
        serverOnly: /["']server-only["']/.test(text) || /^(lib\/server|app\/api)\//.test(file),
        imports, edges, barrel, uses, dynamic, rootCalls, scope,
        tourLike: /data-tour|metric/i.test(text),
    };

    cache.set(file, info);
    REEXPORTS.set(file, reexports);
    void from;

    return info;
}

// ---------- graph per route ----------
export function campaignPages(): string[] {
    const pages: string[] = [];

    const walk = (dir: string) => {
        for (const n of readdirSync(join(ROOT, dir))) {
            const rel = `${dir}/${n}`;

            if (n === '__tests__' || n === 'node_modules') continue;

            if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
            else if (n === 'page.tsx') pages.push(rel);
        }
    };

    walk('app/campaigns');

    return pages.sort();
}

const SEG_FILES = ['layout', 'template', 'loading', 'error', 'not-found'];

export const rootsOf = (page: string): string[] => {
    const dir = dirname(page);

    const parts = dir.split('/');

    const out = [page];

    for (let i = 2; i <= parts.length; i++) {
        const d = parts.slice(0, i).join('/');

        for (const s of SEG_FILES) for (const e of ['tsx', 'ts']) if (exists(`${d}/${s}.${e}`)) out.push(`${d}/${s}.${e}`);
    }

    return out;
};
export const routeName = (p: string) => dirname(p).replace(/^app\/campaigns\/?/, '') || '/';

export type Mode = 'server' | 'client';

const exportsName = (file: string, name: string, depth = 0): boolean => {
    if (depth > 8) return true;

    const info = parse(file);

    if (!info.barrel) return new RegExp(`export\\s+(?:declare\\s+)?(?:async\\s+)?(?:const|let|var|function\\*?|class|enum|type|interface)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b|export\\s+default`).test(info.text) || name === 'default' || /export\s*\*/.test(info.text);

    return REEXPORTS.get(file)!.some((r) => (r.star ? exportsName(r.target, name, depth + 1) : r.map.some((x) => x.split('=')[0] === name || x === '*=*')));
};

export function reach(roots: string[], blockSystems: boolean, parents?: Map<string, string>) {
    const seen = new Map<string, Set<Mode>>();

    const barrelSeen = new Set<string>();

    const queue: [string, Mode, string[] | null, string?][] = roots.map((r) => [r, 'server', null]);

    while (queue.length) {
        const [f, m0, names, par] = queue.pop()!;

        if (blockSystems && f.startsWith('systems/')) continue;

        const info = parse(f);

        if (info.serverOnly) continue;

        const m: Mode = info.useClient ? 'client' : m0;

        if (info.barrel && names) {
            for (const n of names) {
                const key = `${f}::${n}::${m}`;

                if (barrelSeen.has(key)) continue;

                barrelSeen.add(key);
                for (const r of REEXPORTS.get(f)!) {
                    const hit = r.map.find((x) => x.split('=')[0] === n);

                    if (hit) queue.push([r.target, m, [hit.split('=')[1]], f]);
                    else if (r.star && exportsName(r.target, n)) queue.push([r.target, m, [n], f]);
                    else if (r.map.includes('*=*')) queue.push([r.target, m, null, f]);
                }
            }

            if (!seen.has(f)) seen.set(f, new Set([m]));
            else seen.get(f)!.add(m);

            continue;
        }

        const set = seen.get(f) ?? new Set<Mode>();

        if (set.has(m)) continue;

        set.add(m);
        seen.set(f, set);

        if (par && parents && !parents.has(f)) parents.set(f, par);

        if (info.barrel) {
            for (const r of REEXPORTS.get(f)!) queue.push([r.target, m, null, f]);
            continue;
        }

        for (const e of info.edges) queue.push([e.target, m, e.names, f]);
    }

    return seen;
}


/** Literal-key false positives: tour anchors, hint ids, metric names and text refs that only look like `ns.key`. */
export const FALSE_POSITIVE_FILES: ReadonlySet<string> = new Set([
    'lib/onboarding/demo-tours.ts',
    'lib/onboarding/hints.ts',
    'lib/ops/metrics-catalog.ts',
    'lib/utils/battle/view/health.ts',
]);

/** Namespaces translated on the server (getTranslator), so their literal keys never reach the client bundle. */
export const SERVER_TRANSLATED: ReadonlySet<string> = new Set(['errors', 'assistant', 'compendiumReport']);

export type UseKind = 'hook' | 'server' | 'literal' | 'template';
export interface NsUse { ns: string; file: string; kind: UseKind }
export interface RouteGraph {
    page: string;
    chain: string[];
    files: ReadonlySet<string>;
    uses: NsUse[];
    declaredRoutes: string[];
    usesBase: boolean;
}

const countsUse = (u: Use, file: string) =>
    !((u.how === 'literal' || u.how === 'template') && (FALSE_POSITIVE_FILES.has(file) || SERVER_TRANSLATED.has(u.ns)));

function collectUses(files: Iterable<string>): NsUse[] {
    const out: NsUse[] = [];

    const seen = new Set<string>();

    for (const file of files) {
        for (const u of parse(file).uses) {
            if (!countsUse(u, file)) continue;

            const id = `${u.ns}|${file}|${u.how}`;

            if (seen.has(id)) continue;

            seen.add(id);
            out.push({ ns: u.ns, file, kind: u.how });
        }
    }

    return out;
}

const ROUTE_ATTR = /<RouteScope[^>]*route=["']([^"']+)["']/g;

export function routeGraph(page: string): RouteGraph {
    const roots = rootsOf(page);

    const chain = roots.filter((r) => r.endsWith('/layout.tsx'));

    const graph = reach(roots, true);

    const clientFiles = [...graph].filter(([, modes]) => modes.has('client')).map(([f]) => f);

    const declaredRoutes = chain.flatMap((f) => [...read(f).matchAll(ROUTE_ATTR)].map((m) => m[1]));

    return {
        page,
        chain,
        files: new Set(graph.keys()),
        uses: collectUses(clientFiles),
        declaredRoutes,
        usesBase: chain.includes('app/campaigns/layout.tsx'),
    };
}

function walkSystemUi(dir: string, out: string[] = []): string[] {
    if (!exists(dir)) return out;

    for (const n of readdirSync(join(ROOT, dir))) {
        const rel = `${dir}/${n}`;

        if (n === '__tests__' || n === 'node_modules') continue;

        if (statSync(join(ROOT, rel)).isDirectory()) walkSystemUi(rel, out);
        else if (/\.tsx?$/.test(n)) out.push(rel);
    }

    return out;
}

/** Uses in registry-rendered UI of one system (the route graph cuts systems/* off at the registries). */
export function systemUiUses(systemDir: string): NsUse[] {
    return collectUses(['ui', 'hooks'].flatMap((d) => walkSystemUi(`${systemDir}/${d}`)));
}
