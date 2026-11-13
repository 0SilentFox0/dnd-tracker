import { Prisma } from '@prisma/client';

import { layeredModels } from '@/lib/db/layer/config';
import { BUNDLE_TABLES } from '@/lib/server/templates/bundle';
import { clearBundleCache } from '@/lib/server/templates/bundle-cache';
import { exportCampaign } from '@/lib/server/templates/export-campaign';
import { importBundle } from '@/lib/server/templates/import-bundle';
import type { SyncDb } from '@/lib/server/templates/sync/context';
import { baselineFromBundle } from '@/lib/server/templates/sync/hash';

type Row = Record<string, unknown>;

const dbNullToNull = (r: Row): Row =>
    Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, v === Prisma.DbNull ? null : v])
    );

const copy = <T>(v: T): T => structuredClone(v);

const readCopy = <T>(v: T | undefined): T | null => (v ? copy(v) : null);

// the fake does not bump contentVersion, so any write drops the bundle cache like a version bump would
export function createFakeSyncDb() {
    clearBundleCache();

    const store = new Map<string, Row[]>([
        ...BUNDLE_TABLES.map((t) => [t.delegate, [] as Row[]] as const),
        ['character', []],
        ['characterInventory', []],
    ]);

    const campaigns: Row[] = [];

    const syncs = new Map<string, Row>();

    const updates: Array<{ delegate: string; data: Row }> = [];

    const published = new Map<string, number>();

    const hides: Row[] = [];

    const db: Record<string, unknown> = {
        campaign: {
            findMany: async ({
                where,
            }: {
                where?: {
                    AND?: [
                        {
                            OR: Array<{
                                templateKey: { in: string[] } | null;
                                name?: { in: string[] };
                            }>;
                        },
                        unknown,
                    ];
                };
            } = {}) => {
                const alternatives = where?.AND?.[0].OR ?? [];

                const keyMatches = (r: {
                    templateKey?: string | null;
                    name?: string | null;
                }) =>
                    alternatives.some((alt) =>
                        alt.templateKey
                            ? alt.templateKey.in.includes(r.templateKey ?? '')
                            : r.templateKey == null &&
                              alt.name?.in.includes(r.name ?? '')
                    );

                return campaigns
                    .filter(
                        (r) =>
                            r.kind === 'template' &&
                            r.visibility === 'official' &&
                            keyMatches(r) &&
                            (r.locale == null || r.locale === 'en')
                    )
                    .map(copy);
            },
            findUnique: async ({ where }: { where: { id: string } }) =>
                readCopy(campaigns.find((r) => r.id === where.id)),
            update: async ({
                where,
                data,
            }: {
                where: { id: string };
                data: Row;
            }) => {
                clearBundleCache();

                const c = campaigns.find((r) => r.id === where.id)!;

                Object.assign(c, copy(data));

                return c;
            },
        },
        campaignContentHide: {
            findMany: async ({ where }: { where: { campaignId: string } }) =>
                hides
                    .filter((h) => h.campaignId === where.campaignId)
                    .map(copy),
            createMany: async ({ data }: { data: Row[] }) =>
                void hides.push(...data.map(copy)),
        },
        campaignSourceSync: {
            findUnique: async ({ where }: { where: { campaignId: string } }) =>
                readCopy(syncs.get(where.campaignId)),
            upsert: async ({
                where,
                create,
                update,
            }: {
                where: { campaignId: string };
                create: Row;
                update: Row;
            }) => {
                const existing = syncs.get(where.campaignId);

                const next = existing
                    ? { ...existing, ...copy(update) }
                    : copy(create);

                syncs.set(where.campaignId, next);

                return next;
            },
        },
        characterInventory: {
            findMany: async ({
                where,
            }: {
                where: { character: { campaignId: string } };
            }) =>
                (store.get('characterInventory') ?? [])
                    .filter((r) => r.campaignId === where.character.campaignId)
                    .map(copy),
        },
        character: {
            findMany: async ({
                where,
            }: {
                where: {
                    campaignId: string;
                    race?: string;
                    backgroundId?: string;
                };
            }) =>
                (store.get('character') ?? [])
                    .filter(
                        (r) =>
                            r.campaignId === where.campaignId &&
                            (!where.race || r.race === where.race) &&
                            (!where.backgroundId ||
                                r.backgroundId === where.backgroundId)
                    )
                    .map(copy),
            findUnique: async ({ where }: { where: { id: string } }) =>
                readCopy(
                    (store.get('character') ?? []).find(
                        (r) => r.id === where.id
                    )
                ),
            updateMany: async ({
                where,
                data,
            }: {
                where: { id: string };
                data: Row;
            }) => {
                const c = (store.get('character') ?? []).find(
                    (r) => r.id === where.id
                );

                if (c) Object.assign(c, copy(data));

                return { count: c ? 1 : 0 };
            },
        },
    };

    for (const t of BUNDLE_TABLES) {
        const rows = store.get(t.delegate)!;

        db[t.delegate] = {
            createMany: async ({ data }: { data: Row[] }) => {
                clearBundleCache();
                rows.push(...data.map((r) => copy(dbNullToNull(r))));
            },
            findMany: async ({
                where,
            }: {
                where: { campaignId?: string; id?: { in: string[] } };
            }) => {
                if (where.id)
                    return rows
                        .filter((r) => where.id!.in.includes(r.id as string))
                        .map((r) => ({ id: r.id }));

                return rows
                    .filter((r) => r.campaignId === where.campaignId)
                    .map(copy);
            },
            updateMany: async ({
                where,
                data,
            }: {
                where: { id: string; campaignId: string };
                data: Row;
            }) => {
                clearBundleCache();
                updates.push({ delegate: t.delegate, data });

                const row = rows.find(
                    (r) =>
                        r.id === where.id && r.campaignId === where.campaignId
                );

                if (row) Object.assign(row, copy(dbNullToNull(data)));

                return { count: row ? 1 : 0 };
            },
            deleteMany: async ({
                where,
            }: {
                where: { id: string; campaignId: string };
            }) => {
                clearBundleCache();

                const before = rows.length;

                const kept = rows.filter(
                    (r) =>
                        !(
                            r.id === where.id &&
                            r.campaignId === where.campaignId
                        )
                );

                rows.splice(0, rows.length, ...kept);

                return { count: before - rows.length };
            },
        };
    }

    for (const t of BUNDLE_TABLES)
        db[layeredModels()[t.model].base] = {
            aggregate: async ({
                where,
            }: {
                where: { sourceCampaignId: string };
            }) => ({
                _max: {
                    validFrom: published.get(where.sourceCampaignId) ?? null,
                    validTo: null,
                },
            }),
        };

    const rowsOf = (delegate: string) => {
        const rows = store.get(delegate);

        if (!rows) throw new Error(`unknown delegate ${delegate}`);

        return rows;
    };

    const campaign = (id: string) => campaigns.find((c) => c.id === id)!;

    return {
        db: db as unknown as SyncDb,
        store,
        campaigns,
        syncs,
        updates,
        hides,
        publish: (sourceId: string, version: number) =>
            void published.set(sourceId, version),
        campaign,
        addCampaign: (c: Row) => (
            clearBundleCache(),
            campaigns.push({
                name: 'C',
                visibility: 'private',
                maxLevel: 20,
                xpMultiplier: 2.5,
                allowPlayerEdit: true,
                friendlyFire: false,
                rules: { system: { key: 'homm' } },
                ...c,
            })
        ),
        addRow: (delegate: string, row: Row) => (
            clearBundleCache(),
            rowsOf(delegate).push(row)
        ),
        patchRow: (delegate: string, id: string, patch: Row) => (
            clearBundleCache(),
            Object.assign(rowsOf(delegate).find((r) => r.id === id)!, patch)
        ),
        removeRow: (delegate: string, id: string) => {
            clearBundleCache();

            const rows = rowsOf(delegate);

            rows.splice(0, rows.length, ...rows.filter((r) => r.id !== id));
        },
        patchCampaign: (id: string, patch: Row) => (
            clearBundleCache(),
            Object.assign(campaign(id), patch)
        ),
    };
}

export type FakeSyncDb = ReturnType<typeof createFakeSyncDb>;

export async function clone(f: FakeSyncDb, sourceId: string, targetId: string) {
    const bundle = await exportCampaign(f.db, sourceId);

    f.campaigns.push({
        id: targetId,
        createdFromId: sourceId,
        name: 'T',
        kind: 'campaign',
        visibility: 'private',
        ...bundle.settings,
        rules: bundle.rules,
    });

    const { hashes } = await importBundle(f.db, bundle, targetId);

    await f.db.campaignSourceSync.upsert({
        where: { campaignId: targetId },
        create: {
            campaignId: targetId,
            sourceCampaignId: sourceId,
            baseline: baselineFromBundle(
                bundle,
                hashes
            ) as Prisma.InputJsonObject,
        },
        update: {},
    });
}
