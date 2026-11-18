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
        (m) =>
            m.kind === 'addon'
                ? [...m.keys, m.module, ...(m.aliases ?? [])]
                : [...m.keys, m.module]
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

export const countLiterals = (
    rawText: string,
    tokens: LiteralTokens
): number => {
    const text = rawText
        .split('\n')
        .filter((l) => !l.includes('system-literal-ok'))
        .join('\n');

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
        file === 'lib/utils/templates/registry.ts' ||
        file === 'scripts/shared/system-ratchet.ts'
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

const SCHEMA_FILES = ['prisma/schema/core.prisma'];

const MODULE_SCHEMA_DIR = 'prisma/schema/systems';

const MESSAGE_LOCALES = ['uk', 'en'] as const;

const words = (name: string): string[] =>
    name
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[\s_-]+/)
        .filter(Boolean);

/** Id, singular stem and aliases of every addon, deduplicated */
export const moduleNames = (meta: SystemMeta): string[] => {
    const base = [meta.module, ...(meta.aliases ?? [])];

    return [
        ...new Set(
            base.flatMap((n) => (n.endsWith('s') ? [n, n.slice(0, -1)] : [n]))
        ),
    ];
};

export const allModuleNames = (): string[] => [
    ...new Set(
        (SYSTEM_META as readonly SystemMeta[])
            .filter((m) => m.kind === 'addon')
            .flatMap(moduleNames)
    ),
];

const nameVariants = (names: readonly string[]): string[] => [
    ...new Set(
        names.flatMap((n) => {
            const w = words(n);

            return [w.join(''), w.join('-'), w.join('_')];
        })
    ),
];

const fragmentRe = (names: readonly string[]): RegExp | null =>
    names.length === 0
        ? null
        : new RegExp(
              nameVariants(names)
                  .sort((a, b) => b.length - a.length)
                  .map(escapeRe)
                  .join('|'),
              'gi'
          );

/** A lowercase fragment glued to a preceding letter ("flair") is not a hit; "skipMorale" is */
const fragmentHits = (text: string, re: RegExp | null): number => {
    if (!re) return 0;

    let n = 0;

    for (const m of text.matchAll(re)) {
        const prev = text[(m.index ?? 0) - 1] ?? '';

        const first = m[0][0];

        if (
            !/[a-z]/i.test(prev) ||
            (first === first.toUpperCase() && first !== first.toLowerCase())
        )
            n += 1;
    }

    return n;
};

const stripComments = (text: string): string =>
    text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1');

export const countModuleSurface = (
    text: string,
    names: readonly string[]
): number => fragmentHits(stripComments(text), fragmentRe(names));

/** Prisma models that belong to a module, keyed by the delegate name */
export const MODULE_MODELS: Record<string, string> = {
    skillTree: 'skilltrees',
    skillTreeBase: 'skilltrees',
    characterSkills: 'skilltrees',
    mainSkill: 'skilltrees',
    mainSkillBase: 'skilltrees',
    skill: 'skilltrees',
    skillBase: 'skilltrees',
    artifactSet: 'artifactsets',
    artifactSetBase: 'artifactsets',
};

export const countModuleModelAccess = (
    text: string,
    file = '',
    models: Record<string, string> = MODULE_MODELS
): number => {
    const own = (model: string) => file.startsWith(`systems/${models[model]}/`);

    const names = Object.keys(models).filter((m) => !own(m));

    if (names.length === 0) return 0;

    return (
        stripComments(text).match(
            new RegExp(`\\b(?:prisma|tx|db)\\.(?:${names.join('|')})\\b`, 'g')
        ) ?? []
    ).length;
};

export const scanModuleSurface = (): Record<string, number> => {
    const tokens = literalTokens();

    const names = allModuleNames();

    const out: Record<string, number> = {};

    for (const file of sourceFiles()) {
        if (isLiteralAllowed(file, tokens)) continue;

        const text = fs.readFileSync(path.join(ROOT, file), 'utf8');

        const count =
            countModuleSurface(text, names) +
            countModuleModelAccess(text, file);

        if (count > 0) out[file] = count;
    }

    return out;
};

/** A string is schema text, an array is a list of files relative to the repo root */
export const scanSchemaColumns = (
    input: string | readonly string[] = SCHEMA_FILES,
    names: readonly string[] = allModuleNames()
): string[] => {
    const re = fragmentRe(names);

    const hits: string[] = [];

    const lines = (
        typeof input === 'string'
            ? [input]
            : input
                  .filter((f) => fs.existsSync(path.join(ROOT, f)))
                  .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    ).flatMap((t) => [...t.split('\n'), '}']);

    let model = '';

    for (const line of lines) {
        if (line === '}') model = '';

        const open = /^model\s+(\w+)/.exec(line);

        if (open) {
            model = open[1];

            if (fragmentHits(model, re)) hits.push(`model ${model}`);

            continue;
        }

        const field = /^\s+(\w+)\s/.exec(line);

        if (model && field && fragmentHits(field[1], re))
            hits.push(`${model}.${field[1]}`);
    }

    return hits.sort();
};

/** A module schema file may name only its own module (file name = module id) */
export const scanModuleSchemaFiles = (
    dir: string = MODULE_SCHEMA_DIR
): string[] => {
    const abs = path.join(ROOT, dir);

    if (!fs.existsSync(abs)) return [];

    const metas = (SYSTEM_META as readonly SystemMeta[]).filter(
        (m) => m.kind === 'addon'
    );

    return fs
        .readdirSync(abs)
        .filter((f) => f.endsWith('.prisma'))
        .flatMap((f) => {
            const id = f.replace(/\.prisma$/, '');

            const own = new Set(
                metas.filter((m) => m.module === id).flatMap(moduleNames)
            );

            const foreign = allModuleNames().filter((n) => !own.has(n));

            return scanSchemaColumns(
                fs.readFileSync(path.join(abs, f), 'utf8'),
                foreign
            ).map((hit) => `${f}: ${hit}`);
        })
        .sort();
};

const jsonKeyPaths = (value: unknown, prefix: string): string[] =>
    value && typeof value === 'object'
        ? Object.entries(value).flatMap(([k, v]) => [
              `${prefix}.${k}`,
              ...jsonKeyPaths(v, `${prefix}.${k}`),
          ])
        : [];

export const scanCoreMessageKeys = (
    names: readonly string[] = allModuleNames()
): string[] => {
    const re = fragmentRe(names);

    const owned = new Set(systemNamespaces());

    return MESSAGE_LOCALES.flatMap((locale) => {
        const dir = path.join(ROOT, 'messages', locale);

        return fs
            .readdirSync(dir)
            .filter((f) => f.endsWith('.json') && !owned.has(f.slice(0, -5)))
            .flatMap((f) => {
                const ns = f.slice(0, -5);

                const keys = jsonKeyPaths(
                    JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
                    ns
                ).filter((p) => !p.startsWith('gameTerms.module.'));

                return [ns, ...keys]
                    .filter((p) =>
                        fragmentHits(p.slice(p.lastIndexOf('.') + 1), re)
                    )
                    .map((p) => `${locale}:${p}`);
            });
    }).sort();
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
