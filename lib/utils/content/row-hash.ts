import { hashJson } from '@/lib/utils/battle/store/stable-json';
import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';

const EMPTY_HASHES = new Set<string>(
    (SYSTEM_META as readonly SystemMeta[]).flatMap(
        (m) => m.emptyCharacteristicsHashes ?? []
    )
);

const isEmptyCharacteristics = (v: unknown) =>
    v == null ||
    (typeof v === 'object' && Object.keys(v).length === 0) ||
    EMPTY_HASHES.has(hashJson(v));

/** Content hash of a row's hashed columns; columns added after stored baselines hash as absent while empty (null / default); `slug` is identity metadata and never hashed. Shared by template sync and layer materialization so both sides agree. */
export function contentRowHash(
    model: string,
    picked: Record<string, unknown>
): string {
    const row = { ...picked };

    delete row.slug;

    if (model === 'Unit' && isEmptyCharacteristics(row.characteristics))
        delete row.characteristics;

    if (model === 'Artifact' && row.systemStats == null) delete row.systemStats;

    if (model === 'Race' && row.profile == null) delete row.profile;

    if (model === 'Feat')
        for (const c of ['xpCost', 'maxRank'])
            if (row[c] == null) delete row[c];

    return hashJson(row);
}
