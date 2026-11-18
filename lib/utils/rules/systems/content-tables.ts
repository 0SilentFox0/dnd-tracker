import {
    type ContentTableMeta,
    type DetachRefMeta,
    SYSTEM_META,
    type SystemMeta,
} from '@/lib/utils/rules/systems/meta';

export const CORE_TABLES_BEFORE_MODULES = [
    'spellGroups',
    'races',
    'classes',
    'feats',
    'careers',
    'backgrounds',
    'units',
    'spells',
] as const;

export const CORE_TABLES_AFTER_MODULES = ['artifacts', 'tracks'] as const;

type ModuleTableKey = Extract<
    (typeof SYSTEM_META)[number],
    { contentTables: readonly unknown[] }
>['contentTables'][number]['key'];

export type ModuleDelegate = Extract<
    (typeof SYSTEM_META)[number],
    { contentTables: readonly unknown[] }
>['contentTables'][number]['delegate'];

export type SyncTableScope =
    | (typeof CORE_TABLES_BEFORE_MODULES)[number]
    | (typeof CORE_TABLES_AFTER_MODULES)[number]
    | ModuleTableKey;

const metas = SYSTEM_META as readonly SystemMeta[];

/** Tables the modules add, in bundle order */
export const MODULE_CONTENT_TABLES: readonly ContentTableMeta[] = metas
    .flatMap((m) => m.contentTables ?? [])
    .sort((a, b) => a.order - b.order);

export const MODULE_DETACH_REFS: readonly DetachRefMeta[] = metas.flatMap(
    (m) => m.detachRefs ?? []
);

export const SYNC_TABLE_SCOPES: readonly SyncTableScope[] = [
    ...CORE_TABLES_BEFORE_MODULES,
    ...MODULE_CONTENT_TABLES.map((t) => t.key as SyncTableScope),
    ...CORE_TABLES_AFTER_MODULES,
];

/** Content kind slug → table key for the kinds whose slug differs from their table */
export const MODULE_TABLE_KEY_OF_KIND: Readonly<Record<string, string>> =
    Object.fromEntries(
        MODULE_CONTENT_TABLES.filter((t) => t.kind).map((t) => [t.kind, t.key])
    );
