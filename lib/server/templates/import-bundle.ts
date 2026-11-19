import type { z } from 'zod';

import type { TableHashes } from './sync/types';
import { assertNoLeak, findForeignContentIds } from './assert-no-leak';
import {
    type Bundle,
    BUNDLE_TABLES,
    BundleInvalidError,
    BundleSchema,
    delegateOf,
    pick,
    type TemplateDb,
    toPrismaJson,
} from './bundle';
import { CONTENT_ID_RE, newContentId } from './ids';
import { collectKeysAndStrings, remapIds } from './remap-ids';
import { dropTakenSlugs } from './slug-collisions';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    type CompendiumBundleDb,
    importCompendiumSection,
} from '@/lib/server/compendium-import/bundle';
import { rowHash } from '@/lib/server/templates/sync/hash';
import { backgroundReferenceError } from '@/lib/utils/backgrounds/integrity';

const idCandidates = (bundle: Bundle) =>
    new Set(
        [...collectKeysAndStrings(bundle)].filter((s) => CONTENT_ID_RE.test(s))
    );

/** `overrides` (base id → sourceHash): rows that shadow a base row; any other id missing from the bundle is a base row too. */
export interface ImportLayer {
    overrides: Readonly<Record<string, string | null>>;
}

const isOverrideId = (layer: ImportLayer | undefined, id: string) =>
    !!layer && Object.hasOwn(layer.overrides, id);

export interface ImportOptions {
    /** source id → id of an existing row in the target; mapped, not written */
    reuse?: ReadonlyMap<string, string>;
    /** copy between campaigns: no sourceId/sourceHash/slug */
    detached?: true;
}

type ParsedBundle = z.infer<typeof BundleSchema>;

interface ReuseTarget {
    table: string;
    campaignId: unknown;
    type?: unknown;
}

async function loadReuseTargets(
    tx: TemplateDb,
    reuse: ReadonlyMap<string, string>,
    targetCampaignId: string
) {
    const ids = [...new Set(reuse.values())];

    const found = new Map<string, ReuseTarget>();

    if (ids.length === 0) return found;

    for (const t of BUNDLE_TABLES) {
        const rows = await delegateOf(tx, t).findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                campaignId: true,
                ...(t.key === 'feats' && { type: true }),
            },
        });

        for (const r of rows)
            found.set(r.id as string, {
                table: t.key,
                campaignId: r.campaignId,
                type: r.type,
            });
    }

    for (const id of ids)
        if (found.get(id)?.campaignId !== targetCampaignId)
            throw new BundleInvalidError(
                API_ERRORS.BUNDLE_FOREIGN_CONTENT,
                undefined,
                { ids: id }
            );

    return found;
}

function assertBackgroundRefs(
    bundle: ParsedBundle,
    layer?: ImportLayer,
    reuse?: ReadonlyMap<string, string>,
    reuseTargets?: ReadonlyMap<string, ReuseTarget>
) {
    const reused = [...(reuse ?? [])].map(([from, to]) => ({
        from,
        target: reuseTargets?.get(to),
    }));

    const feats = [
        ...bundle.feats,
        ...reused
            .filter((r) => r.target?.table === 'feats')
            .map((r) => ({ id: r.from, type: r.target!.type })),
    ];

    const spellIds = new Set([
        ...bundle.spells.map((s) => s.id),
        ...reused.filter((r) => r.target?.table === 'spells').map((r) => r.from),
    ]);

    for (const background of layer ? [] : bundle.backgrounds) {
        const error = backgroundReferenceError(
            {
                originFeatId: background.originFeatId,
                choices: background.choices,
            },
            feats,
            spellIds
        );

        if (error) throw new BundleInvalidError(error);
    }
}

function buildIdMap(
    tx: TemplateDb,
    bundle: ParsedBundle,
    layer?: ImportLayer,
    reuse?: ReadonlyMap<string, string>
) {
    const idMap = new Map<string, string>();

    for (const t of BUNDLE_TABLES) {
        const seen = new Set<string>();

        for (const row of bundle[t.key]) {
            if (seen.has(row.id))
                throw new BundleInvalidError(
                    API_ERRORS.BUNDLE_DUPLICATE_ID,
                    undefined,
                    { key: t.key, id: row.id }
                );

            seen.add(row.id);
            idMap.set(
                row.id,
                isOverrideId(layer, row.id) ? row.id : newContentId()
            );
        }
    }

    if (bundle.compendium) {
        if (!tx.compendiumEntry || !tx.compendiumSource || !tx.scenarioPage)
            throw new BundleInvalidError(
                API_ERRORS.IMPORT_BUNDLE_NO_PROVENANCE
            );

        for (const page of bundle.compendium.pages) {
            if (idMap.has(page.id))
                throw new BundleInvalidError(
                    API_ERRORS.IMPORT_BUNDLE_DUPLICATE_PAGE_ID
                );

            idMap.set(page.id, newContentId());
        }
        for (const entry of bundle.compendium.entries) {
            const target =
                entry.kind === 'scenarioPages'
                    ? bundle.compendium.pages
                    : bundle[
                          entry.kind === 'spell-groups'
                              ? 'spellGroups'
                              : entry.kind
                      ];

            if (layer && entry.kind !== 'scenarioPages') {
                if (!idMap.has(entry.localId))
                    idMap.set(entry.localId, entry.localId);

                continue;
            }

            if (!target?.some((row) => row.id === entry.localId))
                throw new BundleInvalidError(
                    API_ERRORS.IMPORT_BUNDLE_PROVENANCE_KIND
                );
        }
    }

    for (const [from, to] of reuse ?? []) idMap.set(from, to);

    return idMap;
}

function storedFor({
    t,
    rowId,
    newId,
    sourceHash,
    layer,
    detached,
}: {
    t: { columns: readonly string[] };
    rowId: string;
    newId: string;
    sourceHash: string;
    layer?: ImportLayer;
    detached?: true;
}) {
    if (detached)
        return {
            id: newId,
            sourceId: null,
            sourceHash: null,
            ...(t.columns.includes('slug') && { slug: null }),
        };

    if (!layer) return { id: newId, sourceId: rowId, sourceHash };

    if (isOverrideId(layer, rowId))
        return {
            id: newContentId(),
            sourceId: rowId,
            sourceHash: layer.overrides[rowId],
        };

    return { id: newId, sourceId: null, sourceHash: null };
}

function buildWrites({
    bundle,
    idMap,
    layer,
    options,
    targetCampaignId,
    warnings,
    hashes,
    remappedRows,
}: {
    bundle: ParsedBundle;
    idMap: Map<string, string>;
    layer?: ImportLayer;
    options?: ImportOptions;
    targetCampaignId: string;
    warnings: string[];
    hashes: TableHashes;
    remappedRows: Record<string, unknown>[];
}) {
    const idsByTable = new Map(
        BUNDLE_TABLES.map((t) => [
            t.key,
            new Set(bundle[t.key].map((r) => r.id)),
        ])
    );

    const writes = BUNDLE_TABLES.map((t) => {
        const rows = dropTakenSlugs(
            bundle[t.key].map((row) => {
                const clean = pick(row, t.columns);

                for (const [col, target] of Object.entries(t.fks)) {
                    const ref = clean[col];

                    if (
                        typeof ref === 'string' &&
                        !layer &&
                        !options?.reuse?.has(ref) &&
                        !idsByTable.get(target!)!.has(ref)
                    ) {
                        warnings.push(`${t.key} ${row.id}: ${col} → null`);
                        clean[col] = null;
                    }
                }

                const remapped = remapIds(clean, idMap);

                remappedRows.push(remapped);

                const sourceHash = rowHash(clean, t);

                (hashes[t.key] ??= {})[row.id] = sourceHash;

                const stored = storedFor({
                    t,
                    rowId: row.id,
                    newId: idMap.get(row.id)!,
                    sourceHash,
                    layer,
                    detached: options?.detached,
                });

                return {
                    ...remapped,
                    ...stored,
                    campaignId: targetCampaignId,
                } as Record<string, unknown> & {
                    id: string;
                    slug?: string | null;
                };
            }),
            new Map()
        ).map((row) => toPrismaJson(row, t));

        return { t, rows };
    });

    return writes;
}

export async function importBundle(
    tx: TemplateDb,
    raw: Bundle,
    targetCampaignId: string,
    layer?: ImportLayer,
    options?: ImportOptions
) {
    const parsed = BundleSchema.safeParse(raw);

    if (!parsed.success)
        throw new BundleInvalidError(
            API_ERRORS.IMPORT_BUNDLE_BAD_FORMAT,
            parsed.error.issues
        );

    const bundle = parsed.data;

    const reuseTargets = options?.reuse
        ? await loadReuseTargets(tx, options.reuse, targetCampaignId)
        : undefined;

    assertBackgroundRefs(bundle, layer, options?.reuse, reuseTargets);

    const warnings: string[] = [];

    const idMap = buildIdMap(tx, bundle, layer, options?.reuse);

    const foreign = layer
        ? []
        : await findForeignContentIds(
              tx,
              idCandidates(bundle),
              new Set(idMap.keys())
          );

    if (foreign.length > 0)
        throw new BundleInvalidError(
            API_ERRORS.BUNDLE_FOREIGN_CONTENT,
            undefined,
            { ids: foreign.slice(0, 5).join(', ') }
        );

    const remappedRows: Record<string, unknown>[] = [];

    const hashes: TableHashes = {};

    const writes = buildWrites({
        bundle,
        idMap,
        layer,
        options,
        targetCampaignId,
        warnings,
        hashes,
        remappedRows,
    });

    assertNoLeak(
        remappedRows,
        new Set(
            [...idMap].filter(([from, to]) => from !== to).map(([from]) => from)
        )
    );

    for (const { t, rows } of writes)
        if (rows.length > 0) await delegateOf(tx, t).createMany({ data: rows });

    if (bundle.compendium)
        await importCompendiumSection(
            tx as CompendiumBundleDb,
            bundle.compendium,
            targetCampaignId,
            idMap
        );

    return { idMap, warnings, hashes };
}
