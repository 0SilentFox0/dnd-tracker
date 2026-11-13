import {
    RULE_SYSTEM_KEYS,
    SYSTEM_META,
    type SystemKind,
    type SystemMeta,
} from './meta';

import { CORE_CONTENT_KINDS } from '@/lib/constants/content-kinds';

/** Registry order; only for previews and fallbacks where no rules exist. */
export const FALLBACK_SYSTEM_KEY: string = RULE_SYSTEM_KEYS[0];

export const MODULE_ID_RE = /^[a-z0-9]+$/;

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

export interface ModuleToggle {
    id: string;
    active: boolean;
    available: boolean;
    reason?: {
        code: 'missingRequires' | 'conflict' | 'requiredBy';
        module: string;
    };
    toggle: 'free' | 'setup';
}

const isBaseMeta = (meta: SystemMeta | undefined): boolean =>
    !!meta && kindOf(meta) === 'base';

export function moduleToggles(
    system: SystemSelection,
    metas: Metas = ALL_META
): ModuleToggle[] {
    const { base, modules } = composition(system, metas);

    const active = new Set(modules);

    return metas
        .filter((m) => kindOf(m) === 'addon')
        .filter((m) => {
            const bases = (m.requires ?? []).filter((r) =>
                isBaseMeta(moduleMetaOf(r, metas))
            );

            return bases.length === 0 || bases.includes(base);
        })
        .map((meta): ModuleToggle => {
            const isActive = active.has(meta.module);

            const dependent = isActive
                ? modules.find((id) =>
                      moduleMetaOf(id, metas)?.requires?.includes(meta.module)
                  )
                : undefined;

            const missing = isActive
                ? undefined
                : (meta.requires ?? []).find(
                      (r) =>
                          !active.has(r) && !isBaseMeta(moduleMetaOf(r, metas))
                  );

            const conflicting = isActive
                ? undefined
                : modules.find(
                      (id) =>
                          meta.conflicts?.includes(id) ||
                          moduleMetaOf(id, metas)?.conflicts?.includes(
                              meta.module
                          )
                  );

            const reason: ModuleToggle['reason'] = dependent
                ? { code: 'requiredBy', module: dependent }
                : missing
                  ? { code: 'missingRequires', module: missing }
                  : conflicting
                    ? { code: 'conflict', module: conflicting }
                    : undefined;

            return {
                id: meta.module,
                active: isActive,
                available: !reason,
                ...(reason && { reason }),
                toggle: meta.toggle ?? 'free',
            };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
}

/** Always an explicit full set: `[]` is a bare base, not "preset default" */
export function withModule(
    system: SystemSelection,
    id: string,
    on: boolean,
    metas: Metas = ALL_META
): SystemSelection {
    const current = composition(system, metas).modules;

    return {
        key: system.key,
        modules: sortedUnique(
            on ? [...current, id] : current.filter((m) => m !== id)
        ),
    };
}

export function moduleChange(
    current: SystemSelection,
    next: SystemSelection,
    metas: Metas = ALL_META
): { changed: boolean; added: string[]; removed: string[]; setup: string[] } {
    const before = new Set(composition(current, metas).modules);

    const after = new Set(composition(next, metas).modules);

    const added = [...after].filter((id) => !before.has(id)).sort();

    const removed = [...before].filter((id) => !after.has(id)).sort();

    const setup = [...added, ...removed]
        .filter((id) => moduleMetaOf(id, metas)?.toggle === 'setup')
        .sort();

    return {
        changed: current.key !== next.key || added.length + removed.length > 0,
        added,
        removed,
        setup,
    };
}

export function contentKindsOf(
    system: SystemSelection,
    metas: Metas = ALL_META
): ReadonlySet<string> {
    const { base, modules } = composition(system, metas);

    const kinds = new Set<string>(CORE_CONTENT_KINDS);

    for (const id of [base, ...modules])
        for (const kind of moduleMetaOf(id, metas)?.contentKinds ?? [])
            kinds.add(kind);

    return kinds;
}

export function dmSectionsOf(
    system: SystemSelection,
    metas: Metas = ALL_META
): ReadonlySet<string> {
    const { base, modules } = composition(system, metas);

    return new Set(
        [base, ...modules].flatMap(
            (id) => moduleMetaOf(id, metas)?.dmSections ?? []
        )
    );
}

export const ownerOfContentKind = (
    kind: string,
    metas: Metas = ALL_META
): string | undefined =>
    metas.find((m) => m.contentKinds?.includes(kind))?.module;
