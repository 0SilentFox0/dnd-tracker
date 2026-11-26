import type { Namespace } from './config';

import {
    composition,
    moduleMetaOf,
    unknownIds,
} from '@/lib/utils/rules/systems/catalog';
import {
    metaOf,
    type PackKey,
    SYSTEM_META,
    type SystemMeta,
    type SystemPageScope,
} from '@/lib/utils/rules/systems/meta';

export type SystemScopeSlot = SystemPageScope;

export interface SystemScopeInput {
    key: string | null;
    modules?: readonly string[];
}

const metasOf = (system: SystemScopeInput | null): SystemMeta[] => {
    if (!system?.key) return [];

    const selection = { key: system.key, modules: system.modules };

    if (unknownIds(selection).some((issue) => issue.code === 'unknownKey'))
        return [];

    const { base, modules } = composition(selection);

    return [
        metaOf(system.key),
        moduleMetaOf(base),
        ...modules.map((id) => moduleMetaOf(id)),
    ].filter((meta): meta is SystemMeta => !!meta);
};

const unique = (list: readonly string[]): readonly Namespace[] =>
    [...new Set(list)] as readonly Namespace[];

export const systemScope = (
    system: SystemScopeInput | null,
    slot: SystemScopeSlot
): readonly Namespace[] =>
    unique(metasOf(system).flatMap((meta) => meta.i18n.pages?.[slot] ?? []));

export const systemPackScope = (
    system: SystemScopeInput | null,
    pack: PackKey
): readonly Namespace[] =>
    unique(metasOf(system).flatMap((meta) => meta.i18n.packs?.[pack] ?? []));

/** Keys of `gameTerms.ruleSystem.*` follow the open set of system keys, so the typed translator cannot check them. */
export const ruleSystemLabelKey = (key: string): never =>
    `ruleSystem.${key}` as never;

/** Rules-form texts of every installed module (`meta.i18n.rules`) */
export const rulesFormScope = (): readonly Namespace[] => [
    ...new Set(
        (SYSTEM_META as readonly SystemMeta[]).flatMap(
            (meta) => (meta.i18n.rules ?? []) as readonly Namespace[]
        )
    ),
];

/** Stored battle-log texts of the modules that can run on the system's base (`meta.i18n.log`): old logs render with the module off */
export const logScope = (
    system: SystemScopeInput | null
): readonly Namespace[] => {
    if (!system?.key) return [];

    const selection = { key: system.key, modules: system.modules };

    if (unknownIds(selection).some((issue) => issue.code === 'unknownKey'))
        return [];

    const { base } = composition(selection);

    return [
        ...new Set(
            (SYSTEM_META as readonly SystemMeta[])
                .filter(
                    (meta) =>
                        meta.module === base ||
                        (
                            meta.requires as readonly string[] | undefined
                        )?.includes(base)
                )
                .flatMap(
                    (meta) => (meta.i18n.log ?? []) as readonly Namespace[]
                )
        ),
    ];
};
