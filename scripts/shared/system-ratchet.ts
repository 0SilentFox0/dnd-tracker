import fs from 'node:fs';
import path from 'node:path';

import { ROOT_SPECS } from './systems-index';

import {
    SYSTEM_META,
    type SystemMeta,
    systemNamespaces,
} from '@/lib/utils/rules/systems/meta';
import { TEMPLATE_REGISTRY } from '@/lib/utils/templates/registry';

export const ROOT = path.resolve(__dirname, '../..');

export const SURFACE_FILE = 'system-surface-exempt.json';

export const IMPORTS_FILE = 'system-imports-exempt.json';

export const LITERALS_FILE = 'system-literals-exempt.json';

export const SCAN_DIRS = [
    'lib',
    'app',
    'components',
    'types',
    'scripts',
] as const;

export const SYSTEM_ROOTS = ROOT_SPECS.map((spec) => spec.file);

const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__', 'grim-icons']);

const TEST_FILE = /\.test\.tsx?$/;

const SOURCE_FILE = /\.tsx?$/;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const sourceFiles = (dirs: readonly string[] = SCAN_DIRS): string[] => {
    const walk = (rel: string): string[] =>
        fs
            .readdirSync(path.join(ROOT, rel), { withFileTypes: true })
            .flatMap((e) => {
                const next = `${rel}/${e.name}`;

                if (e.isDirectory())
                    return SKIP_DIRS.has(e.name) ? [] : walk(next);

                return SOURCE_FILE.test(e.name) && !TEST_FILE.test(e.name)
                    ? [next]
                    : [];
            });

    return dirs
        .filter((d) => fs.existsSync(path.join(ROOT, d)))
        .flatMap(walk)
        .sort();
};

export interface LiteralTokens {
    substring: string[];
    literal: string[];
}

export const literalTokens = (): LiteralTokens => {
    const substring: string[] = [
        ...new Set<string>(
            (SYSTEM_META as readonly SystemMeta[]).flatMap(
                (m) => m.tokens ?? []
            )
        ),
    ];

    const keysAndModules = (SYSTEM_META as readonly SystemMeta[]).flatMap(
        (m) => (m.kind === 'addon' ? [...m.keys] : [...m.keys, m.module])
    );

    return {
        substring,
        literal: [
            ...new Set([
                ...keysAndModules.filter((t) => !substring.includes(t)),
                ...Object.keys(TEMPLATE_REGISTRY),
            ]),
        ],
    };
};

export const countLiterals = (text: string, tokens: LiteralTokens): number => {
    const sub = tokens.substring.length
        ? (
              text.match(
                  new RegExp(tokens.substring.map(escapeRe).join('|'), 'gi')
              ) ?? []
          ).length
        : 0;

    const lit = tokens.literal.length
        ? (
              text.match(
                  new RegExp(
                      `["'\`](?:${tokens.literal.map(escapeRe).join('|')})["'\`]`,
                      'g'
                  )
              ) ?? []
          ).length
        : 0;

    return sub + lit;
};

/** Data and assets (sweep profiles, icon prompts, seeds, the SRD pipeline) name systems by design. */
const DATA_DIRS = [
    'scripts/sim/battle-sweep/profiles/',
    'scripts/assets/',
    'scripts/seed/',
    'scripts/srd/',
] as const;

export const isLiteralAllowed = (
    file: string,
    tokens: LiteralTokens
): boolean => {
    if (
        SYSTEM_ROOTS.includes(file) ||
        file === 'lib/utils/templates/registry.ts'
    )
        return true;

    if (DATA_DIRS.some((dir) => file.startsWith(dir))) return true;

    const owners = new Set([
        ...tokens.substring,
        ...tokens.literal,
        ...SYSTEM_META.map((m) => m.module),
    ]);

    const [a, b, c] = file.split('/');

    return (
        a === 'scripts' &&
        b === 'templates' &&
        (owners.has(c) || (c === 'systems' && owners.has(file.split('/')[3])))
    );
};

export const scanLiterals = (): Record<string, number> => {
    const tokens = literalTokens();

    const out: Record<string, number> = {};

    for (const file of sourceFiles()) {
        if (isLiteralAllowed(file, tokens)) continue;

        const count = countLiterals(
            fs.readFileSync(path.join(ROOT, file), 'utf8'),
            tokens
        );

        if (count > 0) out[file] = count;
    }

    return out;
};

export const moduleIds = (): string[] =>
    (SYSTEM_META as readonly SystemMeta[])
        .filter((m) => m.kind === 'addon')
        .map((m) => m.module);

const Q = '["\'`]';

export const moduleQueryPatterns = (ids: readonly string[]): RegExp[] => {
    if (ids.length === 0) return [];

    const alt = ids.map(escapeRe).join('|');

    return [
        new RegExp(
            `\\bmodules\\??\\.(?:includes|has|some|indexOf|find|filter)\\(\\s*${Q}(?:${alt})${Q}`,
            'g'
        ),
        new RegExp(`\\bext\\??\\.(?:${alt})\\b`, 'g'),
        new RegExp(`\\bext(?:\\?\\.)?\\[\\s*${Q}(?:${alt})${Q}\\s*\\]`, 'g'),
        new RegExp(
            `\\.(?:module|moduleId|addon)\\s*[!=]==\\s*${Q}(?:${alt})${Q}`,
            'g'
        ),
        new RegExp(
            `${Q}(?:${alt})${Q}\\s*[!=]==\\s*[\\w.]*\\.(?:module|moduleId|addon)\\b`,
            'g'
        ),
    ];
};

export const countModuleQueries = (
    text: string,
    ids: readonly string[]
): number =>
    moduleQueryPatterns(ids).reduce(
        (sum, re) => sum + (text.match(re) ?? []).length,
        0
    );

export const scanModuleQueries = (): Record<string, number> => {
    const tokens = literalTokens();

    const ids = moduleIds();

    const out: Record<string, number> = {};

    for (const file of sourceFiles()) {
        if (isLiteralAllowed(file, tokens)) continue;

        const count = countModuleQueries(
            fs.readFileSync(path.join(ROOT, file), 'utf8'),
            ids
        );

        if (count > 0) out[file] = count;
    }

    return out;
};

export interface SurfaceExempt {
    code: Record<string, number>;
    schema: string[];
    messages: string[];
}

const SCHEMA_FILE = 'prisma/schema.prisma';

const MESSAGE_LOCALE = 'en';

const nameRe = (ids: readonly string[]) =>
    new RegExp(ids.map((id) => escapeRe(id).replace(/s$/, '')).join('|'), 'i');

/** `case` labels, object keys and kebab operation names that carry a module id */
export const countModuleSurface = (
    text: string,
    ids: readonly string[]
): number => {
    if (ids.length === 0) return 0;

    const alt = ids.map(escapeRe).join('|');

    return [
        new RegExp(`\\bcase\\s*${Q}(?:${alt})${Q}`, 'g'),
        new RegExp(`${Q}(?:${alt})${Q}\\s*:`, 'g'),
        new RegExp(`^\\s*(?:${alt})\\s*:`, 'gm'),
        new RegExp(`${Q}(?:${alt})-[a-z-]+${Q}`, 'g'),
        new RegExp(`${Q}[a-z]+-(?:${alt})${Q}`, 'g'),
    ].reduce((sum, re) => sum + (text.match(re) ?? []).length, 0);
};

export const scanModuleSurface = (): Record<string, number> => {
    const tokens = literalTokens();

    const ids = moduleIds();

    const out: Record<string, number> = {};

    for (const file of sourceFiles()) {
        if (isLiteralAllowed(file, tokens)) continue;

        const count = countModuleSurface(
            fs.readFileSync(path.join(ROOT, file), 'utf8'),
            ids
        );

        if (count > 0) out[file] = count;
    }

    return out;
};

export const scanSchemaColumns = (
    text: string = fs.readFileSync(path.join(ROOT, SCHEMA_FILE), 'utf8'),
    ids: readonly string[] = moduleIds()
): string[] => {
    const re = nameRe(ids);

    const hits: string[] = [];

    let model = '';

    for (const line of text.split('\n')) {
        const open = /^model\s+(\w+)/.exec(line);

        if (open) {
            model = open[1];

            if (re.test(model)) hits.push(`model ${model}`);

            continue;
        }

        const field = /^\s+(\w+)\s/.exec(line);

        if (model && field && re.test(field[1]))
            hits.push(`${model}.${field[1]}`);
    }

    return hits.sort();
};

const jsonKeyPaths = (value: unknown, prefix: string): string[] =>
    value && typeof value === 'object'
        ? Object.entries(value).flatMap(([k, v]) => [
              `${prefix}.${k}`,
              ...jsonKeyPaths(v, `${prefix}.${k}`),
          ])
        : [];

export const scanCoreMessageKeys = (
    ids: readonly string[] = moduleIds()
): string[] => {
    const re = new RegExp(`^(?:${ids.map(escapeRe).join('|')})$`, 'i');

    const owned = new Set(systemNamespaces());

    const dir = path.join(ROOT, 'messages', MESSAGE_LOCALE);

    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json') && !owned.has(f.slice(0, -5)))
        .flatMap((f) =>
            jsonKeyPaths(
                JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
                f.slice(0, -5)
            )
        )
        .filter((p) => !p.startsWith('gameTerms.module.'))
        .filter((p) => re.test(p.slice(p.lastIndexOf('.') + 1)))
        .sort();
};

export const readSurfaceExempt = (): SurfaceExempt =>
    JSON.parse(fs.readFileSync(path.join(ROOT, SURFACE_FILE), 'utf8'));

export interface ImportEntry {
    file: string;
    reason: string;
}

const SYSTEM_IMPORT = /(?:from|import)\s*\(?\s*["']@\/systems\//;

export const importsSystem = (text: string): boolean =>
    SYSTEM_IMPORT.test(text);

export const isImportAllowed = (file: string): boolean =>
    SYSTEM_ROOTS.includes(file) ||
    file.startsWith('scripts/templates/systems/');

export const scanImporters = (): string[] =>
    sourceFiles().filter(
        (file) =>
            !isImportAllowed(file) &&
            importsSystem(fs.readFileSync(path.join(ROOT, file), 'utf8'))
    );

export const readImportsExempt = (): ImportEntry[] =>
    JSON.parse(fs.readFileSync(path.join(ROOT, IMPORTS_FILE), 'utf8'));

export const readLiteralsExempt = (): Record<string, number> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, LITERALS_FILE), 'utf8'));

const sortedObject = (o: Record<string, number>) =>
    Object.fromEntries(
        Object.entries(o).sort(([a], [b]) => a.localeCompare(b))
    );

export const writeSnapshots = (): void => {
    const known = fs.existsSync(path.join(ROOT, IMPORTS_FILE))
        ? new Map(readImportsExempt().map((e) => [e.file, e.reason]))
        : new Map<string, string>();

    const imports = scanImporters().map((file) => ({
        file,
        reason: known.get(file) ?? 'e1:unassigned',
    }));

    fs.writeFileSync(
        path.join(ROOT, IMPORTS_FILE),
        `${JSON.stringify(imports, null, 2)}\n`
    );

    const surface: SurfaceExempt = {
        code: sortedObject(scanModuleSurface()),
        schema: scanSchemaColumns(),
        messages: scanCoreMessageKeys(),
    };

    fs.writeFileSync(
        path.join(ROOT, SURFACE_FILE),
        `${JSON.stringify(surface, null, 2)}\n`
    );
    fs.writeFileSync(
        path.join(ROOT, LITERALS_FILE),
        `${JSON.stringify(sortedObject(scanLiterals()), null, 2)}\n`
    );
};

if (require.main === module && process.argv.includes('--write')) {
    writeSnapshots();

    const lit = readLiteralsExempt();

    console.info(
        `imports: ${readImportsExempt().length} files; literals: ${Object.keys(lit).length} files / ${Object.values(lit).reduce((a, b) => a + b, 0)} hits`
    );
}
