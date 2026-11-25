import type { WhatsNewEntry } from '@/lib/onboarding/types';
import { i18nNamespaces } from '@/lib/utils/rules/systems/i18n-namespaces';
// <systems:generated>
import { ARTIFACTSETS_META } from '@/systems/artifactsets/meta';
import { D20_META } from '@/systems/d20/meta';
import { DEATHSAVES_META } from '@/systems/deathsaves/meta';
import { DND5E_META } from '@/systems/dnd5e/meta';
import { HEROSCALING_META } from '@/systems/heroscaling/meta';
import { HOMM_META } from '@/systems/homm/meta';
import { INSPIRATION_META } from '@/systems/inspiration/meta';
import { LAIR_META } from '@/systems/lair/meta';
import { MORALE_META } from '@/systems/morale/meta';
import { OFFHAND_META } from '@/systems/offhand/meta';
import { OPPORTUNITY_META } from '@/systems/opportunity/meta';
import { RETALIATION_META } from '@/systems/retaliation/meta';
import { SKILLTREES_META } from '@/systems/skilltrees/meta';
import { UNITSTACKS_META } from '@/systems/unitstacks/meta';
import { WFRP_META } from '@/systems/wfrp/meta';
// </systems:generated>

export type SystemPageScope =
    | 'character'
    | 'dmCharacters'
    | 'dmCharacter'
    | 'dmRules'
    | 'draft';

export type PackKey =
    | 'campaigns'
    | 'dashboard'
    | 'rules'
    | 'characterSheet'
    | 'abilityDisplay'
    | 'abilityEditor'
    | 'contentLibrary'
    | 'story'
    | 'battle'
    | 'ai'
    | 'units';

export interface SystemI18n {
    /** Namespaces the module adds to a core namespace pack; a route loads them when it loads the pack */
    packs?: Partial<Record<PackKey, readonly string[]>>;
    /** Texts of the module's rules-form sections: loaded on the rules page for every installed module, because the wizard lists sections of modules that are still off */
    rules?: readonly string[];
    /** Scopes with the module's stored battle-log texts: loaded for every installed module so old logs render with the module off */
    log?: readonly string[];
    /** Stored log/reject keys from before the texts moved into `log` scopes, old key -> current key (a key ending in `.` is a prefix); the translator resolves them */
    legacyKeys?: Readonly<Record<string, string>>;
    pages?: Partial<Record<SystemPageScope, readonly string[]>>;
    budgetKb?: {
        packs?: Partial<Record<PackKey, number>>;
        pages?: Partial<Record<SystemPageScope, number>>;
    };
}

export type SystemKind = 'base' | 'addon' | 'preset';

/** A table a module adds to template bundles and source sync; module tables sit between `spells` and `artifacts`, by `order` */
export interface ContentTableMeta {
    key: string;
    /** Prisma model name */
    model: string;
    /** Prisma client delegate */
    delegate: string;
    /** Content kind slug when it differs from `key` */
    kind?: string;
    order: number;
    /** Reference kind detached from `detachRefs` when a row of this table is removed */
    detach?: string;
    /** A source update of a row replaces character progress that depends on it */
    erasesProgress?: true;
}

/** `model.column` holds the id of a row of reference kind `kind`; it is nulled (or the row deleted) when that row goes */
export interface DetachRefMeta {
    kind: string;
    model: string;
    column: string;
    cascade?: true;
    /** The model has no campaign column; rows are scoped through their `character` */
    viaCharacter?: true;
}

/** `model.column` is a foreign key to the bundle table `table` of the module, which the Prisma schema does not declare as a relation */
export interface ColumnRefMeta {
    model: string;
    column: string;
    table: string;
}

export interface VocabShapes {
    abilitySources: { id: string; itemLike?: true; table?: string };
    abilityStats: {
        id: string;
        baked?: true;
        timed?: true;
        capped?: true;
        defaultValue?: number;
        sheetKey?: string;
        needsDuration?: true;
        areaOk?: true;
        fearBlock?: true;
    };
    abilityLimitFlags: {
        id: string;
        clears?: readonly string[];
        needsActionTrigger?: true;
    };
    actionTypes: {
        id: string;
        counter?: true;
        serverLabel?: true;
        fx?: 'attack';
        logged?: true;
        blockFlag?: string;
        label?: { title: string; noun: string };
    };
    legendaryKinds: {
        id: string;
        lair?: true;
        log?: { use: string; run: string };
    };
    rollKinds: { id: string; after: string };
    combatStats: { id: string; hidden?: true; neutral?: number };
    logFields: { id: string; code: string; prefix?: string };
    equipSlots: { id: string; weapon?: true; needsLight?: true };
    characterLogTypes: { id: string; toggle?: true };
    unitImportFields: { id: string; type: 'int' };
}

export type VocabKind = keyof VocabShapes;

export type SystemVocab = {
    [K in VocabKind]?: readonly VocabShapes[K][];
};

export interface SystemMeta {
    module: string;
    /** Absent means "base" until every folder declares it */
    kind?: SystemKind;
    keys: readonly string[];
    /** Extra spellings the surface scanner looks for (camelCase words the id cannot show) */
    aliases?: readonly string[];
    preset?: { base: string; modules: readonly string[] };
    requires?: readonly string[];
    conflicts?: readonly string[];
    claims?: readonly string[];
    after?: readonly string[];
    toggle?: 'free' | 'setup';
    /** The base whose d20 rules back the spell-preview sandbox */
    previewSandbox?: true;
    /** The preset used where no rules exist yet (previews, battle setup before the campaign loads) */
    fallback?: true;
    /** Cell scale of a base; read by `cellFeetOf` without touching the registry */
    distance?: { unit: 'ft' | 'yd'; perCell: number };
    tokens?: readonly string[];
    i18n: SystemI18n;
    whatsNew?: readonly WhatsNewEntry[];
    dmSections?: readonly string[];
    contentKinds?: readonly string[];
    contentTables?: readonly ContentTableMeta[];
    detachRefs?: readonly DetachRefMeta[];
    columnRefs?: readonly ColumnRefMeta[];
    /** Stored strings the module owns (ability sources, log keys, slots, ...); the core reads them through `moduleVocab` from every installed module */
    vocab?: SystemVocab;
    /** Content kind -> kinds whose lists an import of it invalidates */
    importLinks?: Readonly<Record<string, readonly string[]>>;
    /** `hashJson` of `characteristics` values the system treats as empty besides null / {} */
    emptyCharacteristicsHashes?: readonly string[];
    /** Row columns the system stores inside `characteristics` (a key, or a path such as `ext.<module>.<key>`); the content hash folds them back so legacy and migrated rows hash alike */
    characteristicsColumns?: readonly (
        | string
        | { column: string; path: readonly string[] }
    )[];
}

export const SYSTEM_META = [
    // <systems:generated>
    ARTIFACTSETS_META,
    D20_META,
    DEATHSAVES_META,
    DND5E_META,
    HEROSCALING_META,
    HOMM_META,
    INSPIRATION_META,
    LAIR_META,
    MORALE_META,
    OFFHAND_META,
    OPPORTUNITY_META,
    RETALIATION_META,
    SKILLTREES_META,
    UNITSTACKS_META,
    WFRP_META,
    // </systems:generated>
] as const satisfies readonly SystemMeta[];

type NamespacesIn<T> = T extends readonly (infer U)[]
    ? U
    : T extends object
      ? NamespacesIn<T[keyof T]>
      : never;

export type SystemNamespace = NamespacesIn<
    (typeof SYSTEM_META)[number]['i18n']
>;

export const RULE_SYSTEM_KEYS: readonly string[] = (
    SYSTEM_META as readonly SystemMeta[]
).flatMap((m) => m.keys);

export const isRuleSystemKey = (k: unknown): k is string =>
    typeof k === 'string' && RULE_SYSTEM_KEYS.includes(k);

export const metaOf = (key: string): SystemMeta | undefined =>
    (SYSTEM_META as readonly SystemMeta[]).find((m) => m.keys.includes(key));

export const systemNamespaces = (): readonly string[] => [
    ...new Set(
        (SYSTEM_META as readonly SystemMeta[]).flatMap(({ i18n }) =>
            i18nNamespaces(i18n)
        )
    ),
];
