import { Prisma } from '@prisma/client';

import {
    extRowKey,
    type ExtSnapshot,
    type ExtSnapshotRow,
    planExtRevert,
    type RevertAction,
} from '@/scripts/db/lib/backfill-ext-common';
import type { RawDb } from '@/scripts/db/lib/raw-db';

export const EXT_BATCH_SIZE = 500;

export const EXT_TX_OPTIONS = { timeout: 120_000, maxWait: 20_000 };

const TABLES: Record<string, Prisma.Sql> = {
    characters: Prisma.raw('characters'),
    units: Prisma.raw('units'),
    units_base: Prisma.raw('units_base'),
};

export const tableSql = (table: string): Prisma.Sql => {
    const sql = TABLES[table];

    if (!sql) throw new Error(`Unknown table: ${table}`);

    return sql;
};

export const keyCondition = (r: {
    table: string;
    id: string;
    validFrom?: number;
}) =>
    r.table === 'units_base'
        ? Prisma.sql`id = ${r.id} AND "validFrom" = ${r.validFrom ?? null}`
        : Prisma.sql`id = ${r.id}`;

export async function activeBattleCampaigns(db: RawDb): Promise<Set<string>> {
    const rows = await db.$queryRaw<{ campaignId: string }[]>(
        Prisma.sql`SELECT DISTINCT "campaignId" FROM battle_scenes WHERE status = 'active'`
    );

    return new Set(rows.map((r) => r.campaignId));
}

export async function writeCharacteristicsCas(
    tx: RawDb,
    row: { table: string; id: string; validFrom?: number },
    next: string,
    expected: string,
    guard: Prisma.Sql = Prisma.sql`true`
): Promise<string | undefined> {
    const [updated] = await tx.$queryRaw<{ text: string }[]>(
        Prisma.sql`UPDATE ${tableSql(row.table)} SET characteristics = ${next}::jsonb WHERE ${keyCondition(row)} AND characteristics::text = ${expected} AND ${guard} RETURNING characteristics::text AS text`
    );

    return updated?.text;
}

export async function currentTexts(
    db: RawDb,
    rows: readonly ExtSnapshotRow[]
): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    for (const table of new Set(rows.map((r) => r.table))) {
        const ids = [
            ...new Set(rows.filter((r) => r.table === table).map((r) => r.id)),
        ];

        const validFrom =
            table === 'units_base'
                ? Prisma.raw('"validFrom"')
                : Prisma.raw('NULL::int');

        for (const r of await db.$queryRaw<
            { id: string; validFrom: number | null; text: string }[]
        >(
            Prisma.sql`SELECT id, ${validFrom} AS "validFrom", characteristics::text AS text FROM ${tableSql(table)} WHERE id = ANY(${ids}::text[])`
        ))
            result.set(
                extRowKey({
                    table,
                    id: r.id,
                    validFrom: r.validFrom ?? undefined,
                }),
                r.text
            );
    }

    return result;
}

export async function revertExtSnapshot(
    db: RawDb,
    snapshot: ExtSnapshot,
    force: boolean
): Promise<{ restored: number; skipped: RevertAction[] }> {
    return db.$transaction(async (tx) => {
        const actions = planExtRevert(
            snapshot,
            await currentTexts(tx, snapshot.rows)
        );

        const conflicts = actions.filter((a) => a.action === 'conflict');

        if (conflicts.length > 0 && !force)
            throw new Error(
                `Conflict: ${conflicts.map((c) => extRowKey(c.row)).join(', ')} changed after apply (--force only by owner decision)`
            );

        let restored = 0;

        for (const { row, action, current } of actions) {
            if (action !== 'restore' && action !== 'conflict') continue;

            const text = await writeCharacteristicsCas(
                tx,
                row,
                row.before,
                current ?? row.after
            );

            if (text === undefined)
                throw new Error(
                    `${extRowKey(row)}: row changed since it was read`
                );

            if (text !== row.before)
                throw new Error(
                    `${extRowKey(row)}: restored value differs from the snapshot`
                );

            restored++;
        }

        return {
            restored,
            skipped: actions.filter(
                (a) => a.action === 'alreadyBefore' || a.action === 'missing'
            ),
        };
    }, EXT_TX_OPTIONS);
}
