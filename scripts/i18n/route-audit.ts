/* Route x namespace audit. Run from the worktree root: pnpm exec tsx <this file> [outDir] */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();
const OUT = process.argv[2] ?? '.';

const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const exists = (f: string) => existsSync(join(ROOT, f));

// ---------- messages ----------
const NS = readdirSync(join(ROOT, 'messages/uk'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort();
const NSSET = new Set(NS);
type J = Record<string, unknown>;
const isObj = (v: unknown): v is J => typeof v === 'object' && v !== null && !Array.isArray(v);
const merge = (a: J, b: J): J => {
    const r: J = { ...a };
    for (const [k, v] of Object.entries(b)) r[k] = isObj(r[k]) && isObj(v) ? merge(r[k] as J, v) : v;
    return r;
};
const load = (loc: string, ns: string): J => JSON.parse(read(`messages/${loc}/${ns}.json`));
const ukMsgs: Record<string, J> = {};
const gz = { uk: {} as Record<string, number>, en: {} as Record<string, number> };
for (const ns of NS) {
    const uk = load('uk', ns);
    ukMsgs[ns] = uk;
    const en = exists(`messages/en/${ns}.json`) ? merge(uk, load('en', ns)) : uk;
    gz.uk[ns] = gzipSync(JSON.stringify({ [ns]: uk }), { level: 9 }).length;
    gz.en[ns] = gzipSync(JSON.stringify({ [ns]: en }), { level: 9 }).length;
}
const kb = (n: number) => (n / 1024).toFixed(1);

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
const IMPORT = /(?:from|import)\s*\(?\s*["'](@\/[^"']+|\.{1,2}\/[^"']*)["']/g;

const USE_CLIENT = /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*["']use client["']/;

interface Use { ns: string; sub: string; how: 'hook' | 'server' | 'literal' | 'template'; syncServerHook?: boolean }
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
const cache = new Map<string, Info>();

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
        if (q) { cur += c; if (c === q) q = ''; continue; }
        if (c === '"' || c === "'" || c === '`') { q = c; cur += c; continue; }
        if ('([{'.includes(c)) d++;
        if (')]}'.includes(c)) d--;
        if (c === ',' && d === 0) { out.push(cur); cur = ''; } else cur += c;
    }
    if (cur.trim()) out.push(cur);
    return out;
};
const STR = /^\s*(["'`])([\w.]*)\1\s*$/;

const REEXPORTS = new Map<string, { target: string; star: boolean; map: string[] }[]>();
function parse(file: string, from?: string): Info {
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
        if (br) for (const part of br[1].split(',')) { const n = part.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, ''); if (n) out.push(n); }
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
            if (br) for (const part of br[1].split(',')) { const [orig, exp] = part.trim().split(/\s+as\s+/); if (orig) map.push(`${exp ?? orig}=${orig.replace(/^type\s+/, '')}`); }
            reexports.push({ target: t, star: star && !/\*\s*as\s/.test(m[2]), map });
            if (/\*\s*as\s/.test(m[2])) reexports[reexports.length - 1].map.push('*=*');
        }
    }
    for (const m of noComments.matchAll(/(?:import\s*\(|import\s+)["'](@\/[^"']+|\.{1,2}\/[^"']*)["']/g)) {
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
        let rest = m[2];
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
        for (const m of text.matchAll(/systemScope\([\s\S]*?,\s*['"](\w+)['"]\s*\)/g)) scope.slots.push(m[1]);
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
const pages: string[] = [];
(function walk(dir: string) {
    for (const n of readdirSync(join(ROOT, dir))) {
        const rel = `${dir}/${n}`;
        if (n === '__tests__' || n === 'node_modules') continue;
        if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
        else if (n === 'page.tsx') pages.push(rel);
    }
})('app/campaigns');
pages.sort();

const SEG_FILES = ['layout', 'template', 'loading', 'error', 'not-found'];
const rootsOf = (page: string): string[] => {
    const dir = dirname(page);
    const parts = dir.split('/');
    const out = [page];
    for (let i = 2; i <= parts.length; i++) {
        const d = parts.slice(0, i).join('/');
        for (const s of SEG_FILES) for (const e of ['tsx', 'ts']) if (exists(`${d}/${s}.${e}`)) out.push(`${d}/${s}.${e}`);
    }
    return out;
};
const routeName = (p: string) => dirname(p).replace(/^app\/campaigns\/?/, '') || '/';

type Mode = 'server' | 'client';
const exportsName = (file: string, name: string, depth = 0): boolean => {
    if (depth > 8) return true;
    const info = parse(file);
    if (!info.barrel) return new RegExp(`export\\s+(?:declare\\s+)?(?:async\\s+)?(?:const|let|var|function\\*?|class|enum|type|interface)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b|export\\s+default`).test(info.text) || name === 'default' || /export\s*\*/.test(info.text);
    return REEXPORTS.get(file)!.some((r) => (r.star ? exportsName(r.target, name, depth + 1) : r.map.some((x) => x.split('=')[0] === name || x === '*=*')));
};
function reach(roots: string[], blockSystems: boolean, parents?: Map<string, string>) {
    const seen = new Map<string, Set<Mode>>();
    const barrelSeen = new Set<string>();
    const queue: [string, Mode, string[] | null, string?][] = roots.map((r) => [r, 'server', null]);
    while (queue.length) {
        const [f, m0, names, par] = queue.pop()!;
        if (blockSystems && f.startsWith('systems/')) continue;
        const info = parse(f);
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

// ---------- system scopes ----------
// literal-key false positives: tour anchors / hint ids / metric names / text refs resolved elsewhere; SERVER_NAMESPACES are translated on the server
const FALSE_POSITIVE_FILES = new Set(['lib/onboarding/demo-tours.ts', 'lib/onboarding/hints.ts', 'lib/ops/metrics-catalog.ts', 'lib/utils/battle/view/health.ts']);
const SERVER_TRANSLATED = new Set(['errors', 'assistant', 'compendiumReport']);
const REQUEST_NS = new Set(['common', 'validation']);
let SYS: any[] = [];
const sysSlots: Record<string, Set<string>> = {};
const REGISTRY_FILES = /^(components\/systems\/registry|lib\/utils\/rules\/systems\/(meta|registry)|lib\/server\/systems\/registry|scripts\/templates\/systems\/index)/;
async function main() {
    SYS = (await import(join(ROOT, 'lib/utils/rules/systems/meta.ts'))).SYSTEM_META as any[];
    const add = (slot: string, l?: readonly string[]) => { (sysSlots[slot] ??= new Set()); (l ?? []).forEach((x) => sysSlots[slot].add(x)); };
    for (const m of SYS) {
        const i = m.i18n ?? {};
        for (const s of ['battle', 'campaign', 'member', 'dm', 'log', 'rules']) add(s, i[s]);
        for (const [s, l] of Object.entries(i.pages ?? {})) add(s, l as string[]);
    }
    const sysNs = new Set(Object.values(sysSlots).flatMap((s) => [...s]));

    const { CAMPAIGN_NAMESPACES, BATTLE_NAMESPACES } = await import(join(ROOT, 'lib/i18n/core-namespaces.ts'));
    const CAMPAIGN = new Set<string>(CAMPAIGN_NAMESPACES);
    const BATTLE = [...BATTLE_NAMESPACES] as string[];

    interface RouteRes {
        route: string; loaded: Set<string>; loadedSys: Set<string>;
        client: Map<string, Set<string>>; server: Map<string, Set<string>>; // ns -> kinds
        clientOnlyViaSystems: Set<string>;
        syncServer: string[]; serverNonRequest: string[]; files: number;
        graph: Map<string, Set<Mode>>; fullFiles: number;
    }
    const results: RouteRes[] = [];
    for (const page of pages) {
        const roots = rootsOf(page);
        const graph = reach(roots, false);
        const noSys = reach(roots, true);
        const loaded = new Set<string>(CAMPAIGN);
        const loadedSys = new Set<string>();
        for (const [f, modes] of graph) {
            if (!modes.has('server')) continue;
            const sc = parse(f).scope;
            sc.lit.forEach((n) => loaded.add(n));
            if (sc.battle) BATTLE.forEach((n) => loaded.add(n));
            for (const s of sc.slots) sysSlots[s]?.forEach((n) => loadedSys.add(n));
            if (sc.rulesForm) sysSlots.rules?.forEach((n) => loadedSys.add(n));
            if (sc.log) sysSlots.log?.forEach((n) => loadedSys.add(n));
        }
        const collect = (g: Map<string, Set<Mode>>) => {
            const client = new Map<string, Set<string>>();
            const server = new Map<string, Set<string>>();
            const syncServer: string[] = [];
            for (const [f, modes] of g) {
                const info = parse(f);
                for (const u of info.uses) {
                    if ((u.how === 'literal' || u.how === 'template') && (FALSE_POSITIVE_FILES.has(f) || SERVER_TRANSLATED.has(u.ns))) continue;
                    for (const mode of modes) {
                        const tgt = mode === 'client' ? client : server;
                        (tgt.get(u.ns) ?? tgt.set(u.ns, new Set()).get(u.ns)!).add(u.how);
                        if (mode === 'server' && u.how === 'hook' && !REQUEST_NS.has(u.ns)) syncServer.push(`${f}: ${u.ns}`);
                    }
                }
            }
            return { client, server, syncServer };
        };
        const prim = collect(noSys);
        const full = collect(graph);
        const registryOnly = new Set([...full.client.keys()].filter((n) => !prim.client.has(n)));
        const { client, server, syncServer } = prim;
        const serverNonRequest: string[] = [];
        const clientOnlyViaSystems = registryOnly;
        results.push({ route: routeName(page), loaded, loadedSys, client, server, clientOnlyViaSystems, syncServer, serverNonRequest, files: noSys.size, graph: noSys, fullFiles: graph.size } as any);
    }
    return { results, sysNs, CAMPAIGN, BATTLE };
}

const counts = (u: Use, f: string) => !((u.how === 'literal' || u.how === 'template') && (FALSE_POSITIVE_FILES.has(f) || SERVER_TRANSLATED.has(u.ns)));
main().then(({ results, sysNs, CAMPAIGN }) => {
    // getTranslator vs getTranslations distinction: re-scan server usages
    const kbs = (ns: string) => gz.uk[ns] ?? 0;
    const L: string[] = [];
    const w = (s = '') => L.push(s);
    const NR = results.length;

    // per-ns aggregate
    const clientRoutes: Record<string, number> = {};
    const serverRoutes: Record<string, number> = {};
    const hookRoutes: Record<string, number> = {};
    for (const ns of NS) { clientRoutes[ns] = 0; serverRoutes[ns] = 0; hookRoutes[ns] = 0; }
    for (const r of results)
        for (const ns of NS) {
            const c = r.client.get(ns), s = r.server.get(ns);
            if (c) clientRoutes[ns]++;
            if (c && [...c].some((k) => k === 'hook')) hookRoutes[ns]++;
            if (s && !c) serverRoutes[ns]++;
        }
    const neededOf = (r: typeof results[number]) => new Set([...r.client.keys()]);

    w('# i18n route x namespace audit');
    w();
    w(`Generated by \`i18n-route-audit.ts\` (worktree dnd-tracker-i18n, branch feat/i18n-route-scopes). ${NR} pages under app/campaigns/**; messages: ${NS.length} namespaces.`);
    w();
    w('Legend: **hook** = `useTranslations/useTranslator` string-literal namespace; **srv** = `getTranslations/getTranslator`; **lit** = key literal `ns.a.b` that resolves in messages/uk (conservative, may be a false positive); **tpl** = template literal prefix. "needed" = client-mode usage (client bundle graph, incl. literal keys from shared non-React code). `*sys` = system-scoped namespace (loaded per campaign composition, worst-case union of all systems shown).');
    w();
    w('## a) Namespaces');
    w();
    w('| ns | uk gzip KB | en gzip KB | #routes client-used | #routes via hook | in CAMPAIGN core | system ns | client-used? | server-only-used? | registry-only routes |');
    w('|---|---:|---:|---:|---:|:-:|:-:|:-:|:-:|---:|');
    const rows = NS.map((ns) => {
        const regOnly = results.filter((r) => r.clientOnlyViaSystems.has(ns)).length;
        const anyClient = clientRoutes[ns] > 0;
        const anyServer = results.some((r) => r.server.has(ns));
        return { ns, anyClient, anyServer, regOnly };
    });
    for (const { ns, anyClient, anyServer, regOnly } of rows.sort((a, b) => kbs(b.ns) - kbs(a.ns)))
        w(`| ${ns} | ${kb(gz.uk[ns])} | ${kb(gz.en[ns])} | ${clientRoutes[ns]} | ${hookRoutes[ns]} | ${CAMPAIGN.has(ns) ? 'yes' : ''} | ${sysNs.has(ns) ? 'sys' : ''} | ${anyClient ? 'yes' : 'NO'} | ${!anyClient && anyServer ? 'yes (server only)' : anyServer ? 'also server' : ''} | ${regOnly || ''} |`);
    w();
    const totalCore = [...CAMPAIGN].reduce((a, n) => a + kbs(n), 0);
    w(`CAMPAIGN_NAMESPACES (${CAMPAIGN.size}) total uk gzip: **${kb(totalCore)} KB**.`);
    w();

    w('## b) Per route');
    w();
    w('Loaded = CAMPAIGN_NAMESPACES + ExtendLocaleScope found in the route graph (worst-case system slots shown with `*sys`). Unused KB counts only non-system loaded namespaces never used on the client side of the route. "missing" = client-needed but not loaded.');
    w();
    w('| route | files | #needed | #loaded | unused uk KB | loaded-but-unused | used-but-not-loaded (MISSING?) |');
    w('|---|---:|---:|---:|---:|---|---|');
    const missingAgg = new Map<string, Map<string, Set<string>>>();
    for (const r of results) {
        const needed = neededOf(r);
        const loadedAll = new Set([...r.loaded, ...r.loadedSys]);
        const unused = [...r.loaded].filter((n) => !needed.has(n));
        const miss = [...needed].filter((n) => !loadedAll.has(n));
        const unusedKb = unused.reduce((a, n) => a + kbs(n), 0);
        const missCell = miss.map((n) => `${n}(${[...r.client.get(n)!].join('/')})`).join(', ');
        w(`| ${r.route} | ${r.files} | ${needed.size} | ${loadedAll.size} | ${kb(unusedKb)} | ${unused.join(', ')}${r.loadedSys.size ? ' ; *sys: ' + [...r.loadedSys].join(',') : ''} | ${missCell} |`);
        for (const n of miss) {
            const m = missingAgg.get(n) ?? new Map<string, Set<string>>();
            missingAgg.set(n, m);
            for (const [f, modes] of r.graph) if (modes.has('client') && parse(f).uses.some((u) => u.ns === n && counts(u, f))) (m.get(f) ?? m.set(f, new Set()).get(f)!).add(r.route);
        }
    }
    w();
    w('### Used-but-not-loaded: files responsible');
    w();
    if (!missingAgg.size) w('none');
    for (const [n, m] of missingAgg) {
        w(`- **${n}** (${m.size} files)`);
        for (const [f, rs] of [...m].slice(0, 8)) w(`  - \`${f}\` [${parse(f).uses.filter((u) => u.ns === n && counts(u, f)).map((u) => u.how).filter((x, i, a) => a.indexOf(x) === i).join('/')}] routes=${rs.size}: ${[...rs].slice(0, 3).join(', ')}${rs.size > 3 ? ', ...' : ''}`);
    }
    w();
    w('Shortest-ish import chain (route graph, systems blocked) for the first responsible file per namespace:');
    w();
    for (const [n, m] of missingAgg) {
        const [f, rs] = [...m][0];
        const r = results.find((x) => x.route === [...rs][0])!;
        const page = pages.find((p) => routeName(p) === r.route)!;
        const parents = new Map<string, string>();
        reach(rootsOf(page), true, parents);
        const chain = [f];
        while (parents.has(chain[0]) && chain.length < 12) chain.unshift(parents.get(chain[0])!);
        w(`- ${n}: route ${r.route}: ${chain.join(' -> ')}`);
    }
    w();

    w('### Server-side findings (per route)');
    w();
    const syncAll = new Map<string, Set<string>>();
    for (const r of results) for (const s of r.syncServer) (syncAll.get(s) ?? syncAll.set(s, new Set()).get(s)!).add(r.route);
    w('Sync `useTranslations(ns)` in a file reached in server mode (no "use client" boundary above it) with ns outside request config {common, validation}:');
    w();
    if (!syncAll.size) w('none');
    for (const [s, rs] of syncAll) w(`- ${s} (routes: ${rs.size}; e.g. ${[...rs].slice(0, 3).join(', ')})`);
    w();

    // c) clusters
    w('## c) Clusters');
    w();
    const frac = (ns: string) => clientRoutes[ns] / NR;
    const core80 = NS.filter((n) => frac(n) >= 0.8);
    w(`### used on client by >=80% of routes (${core80.length}) — core candidates`);
    w();
    w(core80.map((n) => `${n} (${(frac(n) * 100).toFixed(0)}%, ${kb(kbs(n))}KB)`).join(', '));
    w();
    const mid = NS.filter((n) => frac(n) < 0.8 && frac(n) >= 0.2 && !sysNs.has(n));
    w(`### 20–79% of routes (${mid.length})`);
    w();
    w(mid.map((n) => `${n} (${clientRoutes[n]}/${NR}, ${kb(kbs(n))}KB)`).join(', '));
    w();
    w('### Section-owned (1–3 routes-ish, <20%), with the route list');
    w();
    for (const n of NS.filter((x) => frac(x) < 0.2 && clientRoutes[x] > 0 && !sysNs.has(x)))
        w(`- **${n}** ${kb(kbs(n))}KB, ${clientRoutes[n]} routes${CAMPAIGN.has(n) ? ' [in CAMPAIGN core]' : ''}: ${results.filter((r) => r.client.has(n)).map((r) => r.route).slice(0, 6).join(', ')}${clientRoutes[n] > 6 ? ', ...' : ''}`);
    w();
    w('### Never used on the client in any campaign route');
    w();
    w(NS.filter((n) => clientRoutes[n] === 0 && !sysNs.has(n)).map((n) => `${n}${CAMPAIGN.has(n) ? '[CORE!]' : ''} (${kb(kbs(n))}KB, server routes ${results.filter((r) => r.server.has(n)).length})`).join(', ') || 'none');
    w();
    w('### System-scoped namespaces: routes with client use (worst-case)');
    w();
    for (const n of [...sysNs].sort()) w(`- ${n} ${kb(kbs(n))}KB: ${results.filter((r) => r.client.has(n)).map((r) => r.route).slice(0, 5).join(', ') || 'no client use found via import graph'} (${clientRoutes[n]} routes)`);
    w();
    w('### Big reference namespaces (top 12 by uk gzip)');
    w();
    w('| ns | KB | in CAMPAIGN | routes client | hook | routes server-only | kinds |');
    w('|---|---:|:-:|---:|---:|---:|---|');
    const big = [...NS].sort((a, b) => kbs(b) - kbs(a)).slice(0, 12);
    for (const n of big) {
        const kinds = new Set<string>();
        results.forEach((r) => r.client.get(n)?.forEach((k) => kinds.add(k)));
        w(`| ${n} | ${kb(kbs(n))} | ${CAMPAIGN.has(n) ? 'yes' : ''} | ${clientRoutes[n]} | ${hookRoutes[n]} | ${serverRoutes[n]} | ${[...kinds].join(',')} |`);
    }
    w();

    // d) fan-in
    w('## d) Fan-in: files that pull big namespaces into routes');
    w();
    w('For each big namespace (plus abilityRegistry, battleLog, compendium, help, errors, whatsNew): top-10 files by number of routes whose client graph contains the file AND that use the namespace; `via` = most common importer in the route graphs.');
    w();
    const importersOf = (f: string) => {
        const cnt = new Map<string, number>();
        for (const r of results) {
            if (!r.graph.get(f)?.has('client')) continue;
            for (const [g, modes] of r.graph) if (modes.has('client') && parse(g).imports.includes(f)) cnt.set(g, (cnt.get(g) ?? 0) + 1);
        }
        return [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g, c]) => `${g}(${c})`).join(', ');
    };
    const bigSet = [...new Set([...big, 'abilityRegistry', 'battleLog', 'compendium', 'help', 'errors', 'whatsNew'])];
    for (const n of bigSet) {
        const fc = new Map<string, number>();
        for (const r of results)
            for (const [f, modes] of r.graph) if (modes.has('client') && parse(f).uses.some((u) => u.ns === n && counts(u, f))) fc.set(f, (fc.get(f) ?? 0) + 1);
        w(`### ${n} (${kb(kbs(n))}KB, ${clientRoutes[n]} routes)`);
        w();
        const top = [...fc].sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (!top.length) w('- no client-side users');
        for (const [f, c] of top) {
            const hows = [...new Set(parse(f).uses.filter((u) => u.ns === n && counts(u, f)).map((u) => u.how))].join('/');
            w(`- \`${f}\` routes=${c} [${hows}] via ${importersOf(f)}`);
        }
        w();
    }

    // e) dashboard + server
    w('## e) Dashboard and server components');
    w();
    const dash = results.find((r) => r.route === '[id]')!;
    const dneeded = neededOf(dash);
    w(`Dashboard \`[id]\` (app/campaigns/[id]/page.tsx): ${dash.files} files, needs ${dneeded.size} ns on client: ${[...dneeded].join(', ')}.`);
    w(`Server-mode usage on dashboard: ${[...dash.server].map(([n, k]) => `${n}(${[...k].join('/')})`).join(', ')}.`);
    w(`Sync hooks in server components (dashboard): ${dash.syncServer.join('; ') || 'none'}.`);
    w(`Server getTranslations/getTranslator with ns outside {common,validation} on the dashboard: see below.`);
    w();
    w('### Server-mode `getTranslations`/`getTranslator` usage with non-request namespaces');
    w();
    w('`getTranslator(locale, ns)` loads its own messages (safe). Bare next-intl `getTranslations(ns)` reads the request config (only common+validation) so a non-request ns there is MISSING unless wrapped. Detected per file:');
    w();
    const gt = new Map<string, Set<string>>();
    for (const [f, info] of cache) {
        for (const m of info.text.matchAll(/\bgetTranslations\s*\(\s*(?:\{\s*namespace\s*:\s*)?["'`]([\w.]+)["'`]/g)) {
            const ns = m[1].split('.')[0];
            if (!REQUEST_NS.has(ns)) (gt.get(`${f}: ${ns}`) ?? gt.set(`${f}: ${ns}`, new Set()).get(`${f}: ${ns}`)!).add('x');
        }
    }
    if (!gt.size) w('none');
    for (const k of gt.keys()) w(`- ${k}`);
    w();

    // appendix: dynamic + ambiguous
    w('## Appendix: dynamic / ambiguous');
    w();
    w(`Excluded literal-key false positives (not counted as usage): ${[...FALSE_POSITIVE_FILES].join(', ')}; and literals of server-translated namespaces ${[...SERVER_TRANSLATED].join(', ')} (SERVER_NAMESPACES, translated in API routes).`);
    w();
    w('### Dynamic or unknown namespace arguments (reached from campaign routes)');
    w();
    const reached = new Set<string>();
    results.forEach((r) => r.graph.forEach((_m, f) => reached.add(f)));
    const dyn = new Map<string, string[]>();
    for (const f of reached) for (const d of parse(f).dynamic) (dyn.get(f) ?? dyn.set(f, []).get(f)!).push(`${d.call}(${d.arg})`);
    for (const [f, ds] of dyn) w(`- \`${f}\`: ${[...new Set(ds)].join('; ')}`);
    w();
    w('### Literal-only evidence (no hook for the same ns in that file) in files that also mention data-tour/metric, or any literal-only per ns count');
    w();
    const lit = new Map<string, Set<string>>();
    for (const f of reached) {
        const info = parse(f);
        const hookNs = new Set(info.uses.filter((u) => u.how === 'hook' || u.how === 'server').map((u) => u.ns));
        for (const u of info.uses) if ((u.how === 'literal' || u.how === 'template') && !hookNs.has(u.ns)) (lit.get(u.ns) ?? lit.set(u.ns, new Set()).get(u.ns)!).add(f + (info.tourLike ? ' [tour/metric]' : '') + (f.startsWith('systems/') ? ' [system]' : ''));
    }
    for (const [ns, fs] of [...lit].sort((a, b) => b[1].size - a[1].size)) w(`- **${ns}** ${fs.size} files: ${[...fs].slice(0, 5).join(', ')}${fs.size > 5 ? ', ...' : ''}`);
    w();
    w(`Registry caveat: ${REGISTRY_FILES.source} pull every system's UI into every route graph. "registry-only routes" in table a) counts routes where the namespace is used only by files under \`systems/\`.`);
    writeFileSync(join(OUT, 'i18n-route-audit.md'), L.join('\n'));
    writeFileSync(join(OUT, 'i18n-route-audit.json'), JSON.stringify(results.map((r) => ({ route: r.route, files: r.files, needed: [...neededOf(r)], loaded: [...r.loaded], loadedSys: [...r.loadedSys] })), null, 1));
    console.log('done', NR, 'routes');
});
