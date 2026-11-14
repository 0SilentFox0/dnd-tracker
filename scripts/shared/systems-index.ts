import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as prettier from 'prettier';

import { CORE_NAMESPACES } from '@/lib/i18n/core-namespaces';
import { i18nNamespaces } from '@/lib/utils/rules/systems/i18n-namespaces';
import type { SystemI18n } from '@/lib/utils/rules/systems/meta';

const OPEN = '// <systems:generated>';

const CLOSE = '// </systems:generated>';

const upper = (id: string) => id.toUpperCase().replace(/[^A-Z0-9]/g, '_');

interface BlockSpec {
    packs?: boolean;
    /** Emits whole-block lines from the ids (instead of per-id `line`) */
    lines?: (
        ids: string[],
        ctx: { root: string; namespaces: string[] }
    ) => string[];
    /** The layer file must export this name for the id to get a line */
    name?: (id: string) => string;
    layer: (id: string) => string;
    line?: (
        id: string,
        exists: (file: string) => boolean,
        exported: (file: string, name: string) => boolean
    ) => string;
}

export interface RootSpec {
    file: string;
    blocks: BlockSpec[];
}

const at = (id: string, rest = '') => `@/systems/${id}${rest}`;

const metaLayer = (id: string) => `systems/${id}/meta.ts`;

const abilityLayer = (id: string) => `systems/${id}/rules/ability-install.ts`;

const imp =
    (name: (id: string) => string, from: (id: string) => string) =>
    (id: string) =>
        `import { ${name(id)} } from "${from(id)}";`;

const exportsName = (root: string, file: string, name: string): boolean =>
    new RegExp(`export (?:const|function) ${name}\\b`).test(
        fs.readFileSync(path.join(root, file), 'utf8')
    );

const scriptsLayer = (id: string) => `scripts/templates/systems/${id}/index.ts`;

const packLayer = (id: string) => `scripts/templates/${id}/index.ts`;

const i18nBlock = (
    namespaces: string[],
    entry: (ns: string) => string
): string[] => namespaces.map(entry);

export async function namespacesIn(
    root: string,
    ids: string[]
): Promise<string[]> {
    const found = new Set<string>();

    for (const id of ids) {
        const file = path.join(root, metaLayer(id));

        if (/^\s*import\s+(?!type\b)/m.test(fs.readFileSync(file, 'utf8')))
            throw new Error(
                `systems/${id}/meta.ts: only \`import type\` is allowed`
            );

        const mod = (await import(
            `${pathToFileURL(file).href}?stamp=${Math.trunc(fs.statSync(file).mtimeMs)}`
        )) as Record<string, { i18n?: SystemI18n } | undefined>;

        const meta = mod[`${upper(id)}_META`];

        if (!meta)
            throw new Error(
                `systems/${id}/meta.ts: missing export ${upper(id)}_META`
            );

        for (const ns of i18nNamespaces(meta.i18n ?? {})) {
            if ((CORE_NAMESPACES as readonly string[]).includes(ns))
                throw new Error(
                    `systems/${id}/meta.ts: i18n namespace "${ns}" duplicates a core namespace`
                );

            found.add(ns);
        }
    }

    return [...found].sort();
}

export const ROOT_SPECS: readonly RootSpec[] = [
    {
        file: 'global.d.ts',
        blocks: [
            {
                layer: metaLayer,
                lines: (_ids, { namespaces }) =>
                    i18nBlock(
                        namespaces,
                        (ns) =>
                            `${ns}: typeof import("./messages/uk/${ns}.json");`
                    ),
            },
        ],
    },
    {
        file: 'lib/utils/rules/systems/meta.ts',
        blocks: [
            {
                layer: metaLayer,
                line: imp(
                    (id) => `${upper(id)}_META`,
                    (id) => `@/systems/${id}/meta`
                ),
            },
            { layer: metaLayer, line: (id) => `${upper(id)}_META,` },
        ],
    },
    {
        file: 'lib/utils/rules/systems/registry.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/index.ts`,
                name: (id) => `${upper(id)}_MODULE`,
                line: (id, exists, exported) => {
                    const rules = imp(
                        (i) => `${upper(i)}_MODULE`,
                        (i) => at(i)
                    )(id);

                    const ability = abilityLayer(id);

                    return exists(ability) &&
                        exported(ability, `${upper(id)}_ABILITY_MODULE`)
                        ? `${rules}\n${imp(
                              (i) => `${upper(i)}_ABILITY_MODULE`,
                              (i) => at(i, '/rules/ability-install')
                          )(id)}`
                        : rules;
                },
            },
            {
                layer: (id) => `systems/${id}/index.ts`,
                name: (id) => `${upper(id)}_MODULE`,
                line: (id) => `${id}: ${upper(id)}_MODULE,`,
            },
            {
                layer: abilityLayer,
                name: (id) => `${upper(id)}_ABILITY_MODULE`,
                line: (id) => `${id}: ${upper(id)}_ABILITY_MODULE,`,
            },
        ],
    },
    {
        file: 'components/systems/registry.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/ui/index.ts`,
                line: imp(
                    (id) => `${upper(id)}_MODULE_UI`,
                    (id) => `@/systems/${id}/ui`
                ),
            },
            {
                layer: (id) => `systems/${id}/ui/index.ts`,
                line: (id) => `${id}: ${upper(id)}_MODULE_UI,`,
            },
        ],
    },
    {
        file: 'components/systems/install.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/index.ts`,
                name: (id) => `${upper(id)}_MODULE`,
                line: (id, exists, exported) => {
                    const ui =
                        exists(`systems/${id}/ui/index.ts`) &&
                        exported(
                            `systems/${id}/ui/index.ts`,
                            `${upper(id)}_MODULE_UI`
                        )
                            ? `, ui: () => import("${at(id, `/ui`)}").then((m) => m.${upper(id)}_MODULE_UI)`
                            : '';

                    const ability =
                        exists(abilityLayer(id)) &&
                        exported(
                            abilityLayer(id),
                            `${upper(id)}_ABILITY_MODULE`
                        )
                            ? `, ability: () => import("${at(id, `/rules/ability-install`)}").then((m) => m.${upper(id)}_ABILITY_MODULE)`
                            : '';

                    return `${id}: { rules: () => import("${at(id)}").then((m) => m.${upper(id)}_MODULE)${ui}${ability} },`;
                },
            },
        ],
    },
    {
        file: 'lib/server/systems/registry.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/server/index.ts`,
                line: imp(
                    (id) => `${upper(id)}_MODULE_SERVER`,
                    (id) => `@/systems/${id}/server`
                ),
            },
            {
                layer: (id) => `systems/${id}/server/index.ts`,
                line: (id) => `${id}: ${upper(id)}_MODULE_SERVER,`,
            },
        ],
    },
    {
        file: 'lib/utils/abilities/schema/system-effects.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/rules/ability-effects.ts`,
                line: imp(
                    (id) => `${upper(id)}_EFFECT_SCHEMAS`,
                    (id) => `@/systems/${id}/rules/ability-effects`
                ),
            },
            {
                layer: (id) => `systems/${id}/rules/ability-effects.ts`,
                line: (id) => `${upper(id)}_EFFECT_SCHEMAS,`,
            },
        ],
    },
    {
        file: 'lib/utils/abilities/schema/system-flags.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/rules/ability-flags.ts`,
                line: imp(
                    (id) => `${upper(id)}_FLAG_SCHEMAS`,
                    (id) => `@/systems/${id}/rules/ability-flags`
                ),
            },
            {
                layer: (id) => `systems/${id}/rules/ability-flags.ts`,
                line: (id) => `${upper(id)}_FLAG_SCHEMAS,`,
            },
        ],
    },
    {
        file: 'lib/utils/abilities/schema/module-effects.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/rules/ability-module-effects.ts`,
                line: imp(
                    (id) => `${upper(id)}_MODULE_EFFECT_SCHEMAS`,
                    (id) => `@/systems/${id}/rules/ability-module-effects`
                ),
            },
            {
                layer: (id) => `systems/${id}/rules/ability-module-effects.ts`,
                line: (id) => `${upper(id)}_MODULE_EFFECT_SCHEMAS,`,
            },
        ],
    },
    {
        file: 'lib/utils/abilities/templates/system-recipes.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/rules/ability-recipes.ts`,
                name: (id) => `${upper(id)}_ABILITY_RECIPES`,
                line: imp(
                    (id) => `${upper(id)}_ABILITY_RECIPES`,
                    (id) => `@/systems/${id}/rules/ability-recipes`
                ),
            },
            {
                layer: (id) => `systems/${id}/rules/ability-recipes.ts`,
                name: (id) => `${upper(id)}_ABILITY_RECIPES`,
                line: (id) =>
                    `{ system: "${id}", items: ${upper(id)}_ABILITY_RECIPES },`,
            },
        ],
    },
    {
        file: 'lib/utils/abilities/build/system-sources.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/rules/ability-sources.ts`,
                name: (id) => `${upper(id)}_ABILITY_SOURCES`,
                line: imp(
                    (id) => `${upper(id)}_ABILITY_SOURCES`,
                    (id) => `@/systems/${id}/rules/ability-sources`
                ),
            },
            {
                layer: (id) => `systems/${id}/rules/ability-sources.ts`,
                name: (id) => `${upper(id)}_ABILITY_SOURCES`,
                line: (id) =>
                    `{ system: "${id}", items: ${upper(id)}_ABILITY_SOURCES },`,
            },
        ],
    },
    {
        file: 'lib/utils/content/import/fields/system-specs.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/rules/import-specs.ts`,
                name: (id) => `${upper(id)}_IMPORT_SPECS`,
                line: imp(
                    (id) => `${upper(id)}_IMPORT_SPECS`,
                    (id) => `@/systems/${id}/rules/import-specs`
                ),
            },
            {
                layer: (id) => `systems/${id}/rules/import-specs.ts`,
                name: (id) => `${upper(id)}_IMPORT_SPECS`,
                line: (id) => `...${upper(id)}_IMPORT_SPECS,`,
            },
        ],
    },
    {
        file: 'lib/utils/rules/systems/sections.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/rules/sections.ts`,
                line: imp(
                    (id) => `${upper(id)}_SECTIONS`,
                    (id) => `@/systems/${id}/rules/sections`
                ),
            },
            {
                layer: (id) => `systems/${id}/rules/sections.ts`,
                line: (id) => `${id}: ${upper(id)}_SECTIONS,`,
            },
        ],
    },
    {
        file: 'lib/utils/rules/systems/rules-presets.ts',
        blocks: [
            {
                layer: (id) => `systems/${id}/rules/rules-preset.ts`,
                name: (id) => `${upper(id)}_RULES_PRESET`,
                line: imp(
                    (id) => `${upper(id)}_RULES_PRESET`,
                    (id) => `@/systems/${id}/rules/rules-preset`
                ),
            },
            {
                layer: (id) => `systems/${id}/rules/rules-preset.ts`,
                name: (id) => `${upper(id)}_RULES_PRESET`,
                line: (id) => `${id}: ${upper(id)}_RULES_PRESET,`,
            },
        ],
    },
    {
        file: 'scripts/templates/systems/index.ts',
        blocks: [
            {
                layer: scriptsLayer,
                line: imp(
                    (id) => `${upper(id)}_MODULE_HOOKS`,
                    (id) => `@/scripts/templates/systems/${id}`
                ),
            },
            {
                layer: scriptsLayer,
                line: (id) => `${id}: ${upper(id)}_MODULE_HOOKS,`,
            },
        ],
    },
    {
        file: 'scripts/templates/systems/adapters.ts',
        blocks: [
            {
                layer: packLayer,
                packs: true,
                line: imp(
                    (id) => `${upper(id)}_ADAPTER`,
                    (id) => `@/scripts/templates/${id}`
                ),
            },
            {
                layer: packLayer,
                packs: true,
                line: (id) => `"${id}": ${upper(id)}_ADAPTER,`,
            },
        ],
    },
];

export const systemIdsIn = (root: string): string[] => {
    const dir = path.join(root, 'systems');

    if (!fs.existsSync(dir)) return [];

    const ids = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

    for (const id of ids)
        if (!fs.existsSync(path.join(root, metaLayer(id))))
            throw new Error(`systems/${id}: missing meta.ts`);

    return ids;
};

const BLOCK_RE = new RegExp(
    `^([ \\t]*)${OPEN}\\n[\\s\\S]*?^[ \\t]*${CLOSE}`,
    'gm'
);

export const packKeysIn = (root: string): string[] => {
    const dir = path.join(root, 'scripts/templates');

    if (!fs.existsSync(dir)) return [];

    return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter(
            (d) =>
                d.isDirectory() &&
                d.name !== 'systems' &&
                fs.existsSync(path.join(dir, d.name, 'index.ts'))
        )
        .map((d) => d.name)
        .sort();
};

const render = (
    spec: RootSpec,
    text: string,
    ids: string[],
    packs: string[],
    ctx: { root: string; namespaces: string[] }
): string => {
    const { root } = ctx;

    const found = [...text.matchAll(BLOCK_RE)].length;

    if (found !== spec.blocks.length)
        throw new Error(
            `${spec.file}: expected ${spec.blocks.length} generated blocks, found ${found}`
        );

    let i = 0;

    return text.replace(BLOCK_RE, (_all, indent: string) => {
        const block = spec.blocks[i++];

        if (block.lines)
            return `${indent}${OPEN}\n${block
                .lines(ids, ctx)
                .map((l) => `${indent}${l}\n`)
                .join('')}${indent}${CLOSE}`;

        const { line } = block;

        if (!line) return `${indent}${OPEN}\n${indent}${CLOSE}`;

        const lines = (block.packs ? packs : ids)
            .filter(
                (id) =>
                    fs.existsSync(path.join(root, block.layer(id))) &&
                    (!block.name ||
                        exportsName(root, block.layer(id), block.name(id)))
            )
            .map(
                (id) =>
                    `${indent}${line(
                        id,
                        (f) => fs.existsSync(path.join(root, f)),
                        (f, name) =>
                            fs.existsSync(path.join(root, f)) &&
                            exportsName(root, f, name)
                    )}\n`
            );

        return `${indent}${OPEN}\n${lines.join('')}${indent}${CLOSE}`;
    });
};

export interface IndexResult {
    stale: string[];
    written: string[];
}

const formatted = async (file: string, text: string): Promise<string> => {
    try {
        return await prettier.format(text, {
            ...(await prettier.resolveConfig(file)),
            filepath: file,
        });
    } catch (error) {
        console.warn(
            `systems-index: prettier failed on ${file}, using unformatted text: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`
        );

        return text;
    }
};

export const syncSystemsIndex = async (
    root: string,
    mode: 'check' | 'write' = 'write'
): Promise<IndexResult> => {
    const ids = systemIdsIn(root);

    const packs = packKeysIn(root);

    const namespaces = await namespacesIn(root, ids);

    const result: IndexResult = { stale: [], written: [] };

    for (const spec of ROOT_SPECS) {
        const file = path.join(root, spec.file);

        if (!fs.existsSync(file)) continue;

        const before = fs.readFileSync(file, 'utf8');

        const after = await formatted(
            file,
            render(spec, before, ids, packs, { root, namespaces })
        );

        if (before === after) continue;

        result.stale.push(spec.file);

        if (mode === 'write') {
            fs.writeFileSync(file, after);
            result.written.push(spec.file);
        }
    }

    return result;
};

if (require.main === module) {
    const check = process.argv.includes('--check');

    syncSystemsIndex(
        path.resolve(__dirname, '../..'),
        check ? 'check' : 'write'
    )
        .then(({ stale }) => {
            if (check && stale.length) {
                console.error(
                    `systems index is stale: ${stale.join(', ')} (run pnpm systems:index)`
                );
                process.exit(1);
            }

            console.info(
                stale.length
                    ? `updated: ${stale.join(', ')}`
                    : 'systems index is up to date'
            );
        })
        .catch((e) => {
            console.error(e);
            process.exit(1);
        });
}
