import { SYSTEM_META, type SystemKind, type SystemMeta } from './meta';

export interface SystemSelection {
    key: string;
    modules?: readonly string[];
}

export interface Composition {
    base: string;
    modules: readonly string[];
}

export type CompositionIssueCode =
    | 'unknownKey'
    | 'unknownModule'
    | 'wrongBase'
    | 'missingRequires'
    | 'conflict'
    | 'duplicateClaim'
    | 'cycle'
    | 'sectionCollision';

export interface CompositionIssue {
    code: CompositionIssueCode;
    module?: string;
    detail?: string;
}

type Metas = readonly SystemMeta[];

const ALL_META: Metas = SYSTEM_META;

export const kindOf = (meta: SystemMeta): SystemKind => meta.kind ?? 'base';

export const presetsOf = (
    metas: Metas = ALL_META
): Record<string, Composition> => {
    const presets: Record<string, Composition> = {};

    for (const meta of metas) {
        if (kindOf(meta) === 'base')
            for (const key of meta.keys)
                presets[key] = { base: meta.module, modules: [] };
        else if (kindOf(meta) === 'preset' && meta.preset)
            for (const key of meta.keys)
                presets[key] = {
                    base: meta.preset.base,
                    modules: meta.preset.modules,
                };
    }

    return presets;
};

export const PRESETS: Readonly<Record<string, Composition>> = presetsOf();

export const moduleMetaOf = (
    id: string,
    metas: Metas = ALL_META
): SystemMeta | undefined => metas.find((m) => m.module === id);

const sortedUnique = (ids: readonly string[]): string[] =>
    [...new Set(ids)].sort();

export function composition(
    system: SystemSelection,
    metas: Metas = ALL_META
): Composition {
    const preset = Object.hasOwn(presetsOf(metas), system.key)
        ? presetsOf(metas)[system.key]
        : undefined;

    if (!preset) throw new Error(`Unknown rule system: ${system.key}`);

    return {
        base: preset.base,
        modules: sortedUnique(system.modules ?? preset.modules),
    };
}

export function unknownIds(
    system: SystemSelection,
    metas: Metas = ALL_META
): CompositionIssue[] {
    if (!Object.hasOwn(presetsOf(metas), system.key))
        return [{ code: 'unknownKey', detail: system.key }];

    return (system.modules ?? [])
        .filter((id) => {
            const meta = moduleMetaOf(id, metas);

            return !meta || kindOf(meta) !== 'addon';
        })
        .map((id) => ({ code: 'unknownModule', module: id }));
}

export interface CatalogEntry {
    id: string;
    kind: SystemKind;
    requires: readonly string[];
    conflicts: readonly string[];
    toggle: 'free' | 'setup';
    nameKey: string;
    summaryKey: string;
}

export interface ModuleCatalog {
    bases: CatalogEntry[];
    addons: CatalogEntry[];
    presets: (CatalogEntry & { key: string; composition: Composition })[];
}

const entryOf = (meta: SystemMeta): CatalogEntry => ({
    id: meta.module,
    kind: kindOf(meta),
    requires: meta.requires ?? [],
    conflicts: meta.conflicts ?? [],
    toggle: meta.toggle ?? 'free',
    nameKey: `gameTerms.module.${meta.module}.name`,
    summaryKey: `gameTerms.module.${meta.module}.summary`,
});

export function moduleCatalog(metas: Metas = ALL_META): ModuleCatalog {
    const presets = presetsOf(metas);

    return {
        bases: metas.filter((m) => kindOf(m) === 'base').map(entryOf),
        addons: metas.filter((m) => kindOf(m) === 'addon').map(entryOf),
        presets: Object.entries(presets).map(([key, composition]) => ({
            ...entryOf(
                moduleMetaOf(composition.base, metas) ?? {
                    module: composition.base,
                    keys: [],
                    i18n: {},
                }
            ),
            key,
            composition,
        })),
    };
}
