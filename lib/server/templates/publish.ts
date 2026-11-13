import type { Prisma } from '@prisma/client';

import {
    BUNDLE_TABLES,
    type BundleTableDef,
    pick,
    toPrismaJson,
} from './bundle';
import { exportCampaign } from './export-campaign';

import { layeredModels } from '@/lib/db/layer/config';
import { bumpContentVersion } from '@/lib/server/campaigns/version';
import { rowHash } from '@/lib/server/templates/sync/hash';

export interface PublishResult {
    version: number;
    added: number;
    changed: number;
    removed: number;
}

interface BaseDelegate {
    findMany(
        args: unknown
    ): Promise<
        Array<Record<string, unknown> & { id: string; validFrom: number }>
    >;
    createMany(args: { data: unknown[] }): Promise<unknown>;
    updateMany(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
    }): Promise<unknown>;
}

const CHUNK = 200;

const baseDelegate = (db: object, t: BundleTableDef) =>
    (db as unknown as Record<string, BaseDelegate>)[
        layeredModels()[t.model].base
    ];

interface VersionWindow {
    _max: { validFrom: number | null; validTo: number | null };
}

/** Newest version at which the template's base rows changed; null while it was never published. */
export async function latestPublishedVersion(
    db: object,
    templateId: string
): Promise<number | null> {
    const windows = await Promise.all(
        BUNDLE_TABLES.map((t) =>
            (
                db as unknown as Record<
                    string,
                    { aggregate(args: unknown): Promise<VersionWindow> }
                >
            )[layeredModels()[t.model].base].aggregate({
                where: { sourceCampaignId: templateId },
                _max: { validFrom: true, validTo: true },
            })
        )
    );

    const versions = windows
        .flatMap((w) => [w._max.validFrom, w._max.validTo])
        .filter((v): v is number => v != null);

    return versions.length ? Math.max(...versions) : null;
}

/** Writes the template's current rows as the next base version; unchanged rows keep their open window. */
export async function publishTemplateVersion(
    db: Prisma.TransactionClient,
    templateId: string
): Promise<PublishResult> {
    const bundle = await exportCampaign(db, templateId);

    const plans = await Promise.all(
        BUNDLE_TABLES.map(async (t) => {
            const open = await baseDelegate(db, t).findMany({
                where: { sourceCampaignId: templateId, validTo: null },
            });

            const openHashes = new Map(
                open.map((row) => [row.id, rowHash(row, t)])
            );

            const rows = bundle[t.key];

            const current = new Map(rows.map((row) => [row.id, row]));

            const openSlug = new Map(
                open.map((row) => [row.id, row.slug ?? null])
            );

            const slugFixes = rows.filter(
                (row) =>
                    openHashes.get(row.id) === rowHash(row, t) &&
                    openSlug.get(row.id) !==
                        ((row.slug as string | null | undefined) ?? null)
            );

            return {
                t,
                slugFixes,
                latest: open.reduce(
                    (max, row) => Math.max(max, row.validFrom),
                    0
                ),
                inserts: rows.filter(
                    (row) => openHashes.get(row.id) !== rowHash(row, t)
                ),
                closes: [...openHashes]
                    .filter(
                        ([id, hash]) =>
                            !current.has(id) ||
                            rowHash(current.get(id)!, t) !== hash
                    )
                    .map(([id]) => id),
                added: rows.filter((row) => !openHashes.has(row.id)).length,
                removed: open.filter((row) => !current.has(row.id)).length,
            };
        })
    );

    for (const { t, slugFixes } of plans)
        for (const row of slugFixes)
            await baseDelegate(db, t).updateMany({
                where: {
                    sourceCampaignId: templateId,
                    validTo: null,
                    id: row.id,
                },
                data: { slug: (row.slug as string | null | undefined) ?? null },
            });

    const touched = plans.some((p) => p.inserts.length || p.closes.length);

    if (!touched) {
        const latest = Math.max(0, ...plans.map((p) => p.latest));

        return { version: latest, added: 0, changed: 0, removed: 0 };
    }

    const version = await bumpContentVersion(db, templateId);

    let added = 0,
        changed = 0,
        removed = 0;

    for (const { t, inserts, closes, added: a, removed: r } of plans) {
        const delegate = baseDelegate(db, t);

        const stamp = layeredModels()[t.model].baseFields.has('updatedAt')
            ? { updatedAt: new Date() }
            : {};

        for (let i = 0; i < closes.length; i += CHUNK)
            await delegate.updateMany({
                where: {
                    sourceCampaignId: templateId,
                    validTo: null,
                    id: { in: closes.slice(i, i + CHUNK) },
                },
                data: { validTo: version },
            });

        for (let i = 0; i < inserts.length; i += CHUNK) {
            await delegate.createMany({
                data: inserts.slice(i, i + CHUNK).map((row) =>
                    toPrismaJson(
                        {
                            ...pick(row, t.columns),
                            sourceCampaignId: templateId,
                            validFrom: version,
                            ...stamp,
                        },
                        t
                    )
                ),
            });
        }

        added += a;
        removed += r;
        changed += inserts.length - a;
    }

    return { version, added, changed, removed };
}
