import { hashJson } from '@/lib/utils/battle/store/stable-json';
import { isRecord } from '@/lib/utils/common/is-record';
import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';
import {
    getAtPath,
    omitAtPath,
    STORED_COLUMN_ENTRIES,
} from '@/lib/utils/rules/systems/stored-columns';

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

    if (
        (model === 'Unit' || model === 'Character') &&
        isRecord(row.characteristics)
    ) {
        let rest: Record<string, unknown> = { ...row.characteristics };

        for (const { column, path } of STORED_COLUMN_ENTRIES) {
            const value = getAtPath(rest, path);

            if (value !== undefined) {
                row[column] = value;
                rest = omitAtPath(rest, path);
            }
        }

        if (isRecord(rest.ext) && Object.keys(rest.ext).length === 0)
            delete rest.ext;

        row.characteristics = rest;
    }

    // the morale column may be dropped; zero morale hashes the same as the old default
    if ((model === 'Unit' || model === 'UnitBase') && row.morale === undefined)
        row.morale = 0;

    if (
        (model === 'Unit' || model === 'Character') &&
        isEmptyCharacteristics(row.characteristics)
    )
        delete row.characteristics;

    if (model === 'Artifact' && row.systemStats == null) delete row.systemStats;

    if (model === 'Race' && row.profile == null) delete row.profile;

    if (model === 'Feat')
        for (const c of ['xpCost', 'maxRank'])
            if (row[c] == null) delete row[c];

    return hashJson(row);
}
