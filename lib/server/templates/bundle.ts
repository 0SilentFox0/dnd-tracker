import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { CONTENT_ID_RE } from './ids';

import type { ErrorParams } from '@/lib/constants/api-errors';
import {
    type CompendiumBundle,
    type CompendiumBundleDb,
    CompendiumBundleSchema,
} from '@/lib/server/compendium-import/bundle';
import { unsafeCast } from '@/lib/utils/common/cast';
import {
    MODULE_COLUMN_REFS,
    MODULE_CONTENT_TABLES,
    MODULE_TABLE_KEY_OF_KIND,
    type ModuleDelegate,
    type SyncTableScope,
} from '@/lib/utils/rules/systems/content-tables';

export type BundleTable = SyncTableScope;

type CoreDelegate =
    | 'spellGroup'
    | 'race'
    | 'gameClass'
    | 'feat'
    | 'career'
    | 'background'
    | 'unit'
    | 'spell'
    | 'artifact'
    | 'campaignTrack';

type Delegate = CoreDelegate | ModuleDelegate;

export interface BundleTableDef {
    key: BundleTable;
    model: Prisma.ModelName;
    delegate: Delegate;
    columns: readonly string[];
    nullableJson: readonly string[];
    fks: Partial<Record<string, BundleTable>>;
}

const EXCLUDED_COLUMNS = new Set([
    'campaignId',
    'createdAt',
    'updatedAt',
    'sourceId',
    'sourceHash',
]);

const CORE_MODELS: ReadonlyArray<readonly [BundleTable, string, Delegate]> = [
    ['spellGroups', 'SpellGroup', 'spellGroup'],
    ['races', 'Race', 'race'],
    ['classes', 'GameClass', 'gameClass'],
    ['feats', 'Feat', 'feat'],
    ['careers', 'Career', 'career'],
    ['backgrounds', 'Background', 'background'],
    ['units', 'Unit', 'unit'],
    ['spells', 'Spell', 'spell'],
];

const CORE_MODELS_TAIL: ReadonlyArray<
    readonly [BundleTable, string, Delegate]
> = [
    ['artifacts', 'Artifact', 'artifact'],
    ['tracks', 'CampaignTrack', 'campaignTrack'],
];

const ALL_MODELS: ReadonlyArray<readonly [BundleTable, string, Delegate]> = [
    ...CORE_MODELS,
    ...MODULE_CONTENT_TABLES.map(
        (t) => [t.key as BundleTable, t.model, t.delegate as Delegate] as const
    ),
    ...CORE_MODELS_TAIL,
];

const SCALAR_ENUMS = Prisma as unknown as Record<
    string,
    Record<string, string>
>;

const MODEL_TO_KEY: Record<string, BundleTable> = Object.fromEntries(
    ALL_MODELS.map(([key, model]) => [model, key])
);

function deriveFks(
    fields: readonly Prisma.DMMF.Field[]
): Partial<Record<string, BundleTable>> {
    const fks: Partial<Record<string, BundleTable>> = {};

    for (const f of fields) {
        const target = MODEL_TO_KEY[f.type];

        if (f.kind === 'object' && target && f.relationFromFields?.length === 1)
            fks[f.relationFromFields[0]] = target;
    }

    return fks;
}

function table(
    key: BundleTable,
    model: string,
    delegate: Delegate
): BundleTableDef {
    const columns = Object.values(
        SCALAR_ENUMS[`${model}ScalarFieldEnum`]
    ).filter((c) => !EXCLUDED_COLUMNS.has(c));

    const fields =
        Prisma.dmmf.datamodel.models.find((m) => m.name === model)?.fields ??
        [];

    const nullableJson = fields
        .filter(
            (f) =>
                f.type === 'Json' &&
                !f.isRequired &&
                (columns as readonly string[]).includes(f.name)
        )
        .map((f) => f.name);

    return {
        key,
        model: model as Prisma.ModelName,
        delegate,
        columns,
        nullableJson,
        fks: {
            ...deriveFks(fields),
            ...(model === 'Background' && { originFeatId: 'feats' as const }),
            ...Object.fromEntries(
                MODULE_COLUMN_REFS.filter((r) => r.model === model).map((r) => [
                    r.column,
                    r.table as BundleTable,
                ])
            ),
        },
    };
}

export const BUNDLE_TABLES: ReadonlyArray<BundleTableDef> = ALL_MODELS.map(
    ([key, model, delegate]) => table(key, model, delegate)
);

const TABLE_KEY_OF_KIND: Readonly<Record<string, string>> = {
    'spell-groups': 'spellGroups',
    ...MODULE_TABLE_KEY_OF_KIND,
};

/** The one map from a content/pack kind to its bundle table key; kinds named like their table pass through. */
export const tableKey = (kind: string): string =>
    TABLE_KEY_OF_KIND[kind] ?? kind;

export const tableOfKind = (kind: string): BundleTableDef | undefined =>
    BUNDLE_TABLES.find((t) => t.key === tableKey(kind));

const perTable = <T>(make: () => T) =>
    Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, make()])) as Record<
        BundleTable,
        T
    >;

const rowSchema = z
    .array(z.looseObject({ id: z.string().regex(CONTENT_ID_RE) }))
    .max(5000);

export const BUNDLE_FORMAT_VERSION = 1 as const;

export const BundleSchema = z.object({
    formatVersion: z.literal(BUNDLE_FORMAT_VERSION),
    settings: z.strictObject({
        maxLevel: z.number().min(1).max(30),
        xpMultiplier: z.number().min(0).max(10),
        allowPlayerEdit: z.boolean(),
        friendlyFire: z.boolean(),
    }),
    rules: z.unknown(),
    credits: z.string().max(10_000).nullable().optional(),
    compendium: CompendiumBundleSchema.optional(),
    ...perTable(() => rowSchema),
    classes: rowSchema.default([]),
    feats: rowSchema.default([]),
    careers: rowSchema.default([]),
    backgrounds: rowSchema.default([]),
}) as unknown as z.ZodType<Bundle>;

export type Bundle = {
    formatVersion: 1;
    settings: {
        maxLevel: number;
        xpMultiplier: number;
        allowPlayerEdit: boolean;
        friendlyFire: boolean;
    };
    rules: unknown;
    credits?: string | null;
    compendium?: CompendiumBundle;
} & Record<BundleTable, Array<Record<string, unknown> & { id: string }>>;

export function emptyBundle(): Bundle {
    return {
        formatVersion: 1,
        settings: {
            maxLevel: 20,
            xpMultiplier: 2.5,
            allowPlayerEdit: true,
            friendlyFire: false,
        },
        rules: {},
        ...perTable(() => []),
    };
}

export type TemplateDb = Pick<Prisma.TransactionClient, Delegate | 'campaign'> &
    Partial<CompendiumBundleDb> &
    Partial<Pick<Prisma.TransactionClient, 'campaignContentHide'>>;

export class TemplateLeakError extends Error {}

export class BundleInvalidError extends Error {
    constructor(
        message: string,
        public issues?: unknown,
        public params?: ErrorParams
    ) {
        super(message);
    }
}

export const BUNDLE_SETTING_KEYS = [
    'maxLevel',
    'xpMultiplier',
    'allowPlayerEdit',
    'friendlyFire',
] as const;

export type BundleSettingKey = (typeof BUNDLE_SETTING_KEYS)[number];

export const SETTINGS_SELECT = Object.fromEntries(
    BUNDLE_SETTING_KEYS.map((k) => [k, true])
) as Record<BundleSettingKey, true>;

export function pick(
    row: Record<string, unknown>,
    columns: readonly string[]
): Record<string, unknown> {
    const out: Record<string, unknown> = {};

    for (const c of columns) if (c in row) out[c] = row[c];

    return out;
}

export const settingsOf = (row: Record<string, unknown>) =>
    pick(row, BUNDLE_SETTING_KEYS) as Bundle['settings'];

export function toPrismaJson(row: Record<string, unknown>, t: BundleTableDef) {
    const out = { ...row };

    for (const col of t.nullableJson)
        if (out[col] === null) out[col] = Prisma.DbNull;

    return out;
}

export interface RowDelegate {
    findMany(args: unknown): Promise<Array<Record<string, unknown>>>;
    createMany(args: { data: unknown[] }): Promise<unknown>;
    updateMany(args: {
        where: Record<string, unknown>;
        data: unknown;
    }): Promise<{ count: number }>;
    deleteMany(args: {
        where: Record<string, unknown>;
    }): Promise<{ count: number }>;
}

export const delegateOf = (db: TemplateDb, t: BundleTableDef) =>
    unsafeCast<RowDelegate>(
        unsafeCast<Record<string, unknown>>(db)[t.delegate]
    );
