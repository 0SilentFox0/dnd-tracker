import { Prisma } from '@prisma/client';

import { jsonEqual } from '@/lib/utils/battle/store/stable-json';
import {
    type CampaignFact,
    d20CampaignIds,
    rowKey,
    type RowPlan,
    statColumns,
    type StatRow,
    statRowHash,
    type StatTable,
} from '@/scripts/db/lib/backfill-d20-characteristics-plan';
import {
    type CharacteristicsSnapshot,
    type RevertAction,
    revertPlan,
    snapshotKey,
    type SnapshotRow,
} from '@/scripts/db/lib/backfill-d20-characteristics-snapshot';
import type { RawDb } from '@/scripts/db/lib/raw-db';

export type { RawDb };

export const BATCH_SIZE = 500;

const TX_OPTIONS = { timeout: 120_000, maxWait: 20_000 };

const TABLE_SQL: Record<StatTable, Prisma.Sql> = {
    characters: Prisma.raw('characters'),
    units: Prisma.raw('units'),
    units_base: Prisma.raw('units_base'),
};

const OWNER_SQL: Record<StatTable, Prisma.Sql> = {
    characters: Prisma.raw('"campaignId"'),
    units: Prisma.raw('"campaignId"'),
    units_base: Prisma.raw('"sourceCampaignId"'),
};

const columnSql = () =>
    Prisma.join(statColumns().map((c) => Prisma.raw(`"${c}"`)));

type RawRow = {
    id: string;
    validFrom: number | null;
    owner: string;
    label: string;
    text: string;
} & Record<string, unknown>;

export async function loadCampaignFacts(db: RawDb): Promise<CampaignFact[]> {
    const campaigns = await db.$queryRaw<{ id: string; text: string }[]>(
        Prisma.sql`SELECT id, rules::text AS text FROM campaigns ORDER BY "createdAt", id`
    );

    const active = new Set(
        (
            await db.$queryRaw<{ campaignId: string }[]>(
                Prisma.sql`SELECT DISTINCT "campaignId" FROM battle_scenes WHERE status = 'active'`
            )
        ).map((r) => r.campaignId)
    );

    return campaigns.map((c) => ({
        id: c.id,
        text: c.text,
        activeBattle: active.has(c.id),
    }));
}

export async function loadStatRows(
    db: RawDb,
    facts: readonly CampaignFact[]
): Promise<StatRow[]> {
    const ids = d20CampaignIds(facts);

    if (ids.length === 0) return [];

    const activeIds = new Set(
        facts.filter((f) => f.activeBattle).map((f) => f.id)
    );

    const rows: StatRow[] = [];

    for (const table of ['characters', 'units', 'units_base'] as const) {
        const validFrom =
            table === 'units_base'
                ? Prisma.raw('"validFrom"')
                : Prisma.raw('NULL::int');

        const found = await db.$queryRaw<RawRow[]>(
            Prisma.sql`SELECT id, ${validFrom} AS "validFrom", ${OWNER_SQL[table]} AS owner, name AS label, characteristics::text AS text, ${columnSql()} FROM ${TABLE_SQL[table]} WHERE ${OWNER_SQL[table]} = ANY(${ids}::text[]) ORDER BY id`
        );

        for (const r of found)
            rows.push({
                table,
                id: r.id,
                validFrom: r.validFrom ?? undefined,
                campaignId: r.owner,
                label: r.label,
                characteristicsText: r.text,
                columns: Object.fromEntries(
                    statColumns().map((c) => [c, Number(r[c])])
                ),
                activeBattle: activeIds.has(r.owner),
            });
    }

    return rows;
}

const keyCondition = (r: {
    table: StatTable;
    id: string;
    validFrom?: number;
}) =>
    r.table === 'units_base'
        ? Prisma.sql`id = ${r.id} AND "validFrom" = ${r.validFrom ?? null}`
        : Prisma.sql`id = ${r.id}`;

const columnsMatch = (columns: Record<string, number>) =>
    Prisma.join(
        statColumns().map(
            (c) => Prisma.sql`${Prisma.raw(`"${c}"`)} = ${columns[c]}`
        ),
        ' AND '
    );

type Written = { text: string } & Record<string, unknown>;

const writeCharacteristics = (
    tx: RawDb,
    row: { table: StatTable; id: string; validFrom?: number },
    next: string,
    expected: string,
    columns: Record<string, number>
): Promise<Written[]> =>
    tx.$queryRaw(
        Prisma.sql`UPDATE ${TABLE_SQL[row.table]} SET characteristics = ${next}::jsonb WHERE ${keyCondition(row)} AND characteristics::text = ${expected} AND ${columnsMatch(columns)} RETURNING characteristics::text AS text, ${columnSql()}`
    );

const rowChanged = (r: { table: StatTable; id: string; validFrom?: number }) =>
    new Error(`${rowKey(r)}: row changed since it was read`);

const columnsOf = (w: Written) =>
    Object.fromEntries(statColumns().map((c) => [c, Number(w[c])]));

export async function applyPlans(
    db: RawDb,
    plans: readonly RowPlan[],
    write: (rows: SnapshotRow[]) => void
): Promise<SnapshotRow[]> {
    const targets = plans.filter((p) => p.action === 'write' && p.afterJson);

    const done: SnapshotRow[] = [];

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);

        const rows = await db.$transaction(async (tx) => {
            const out: SnapshotRow[] = [];

            for (const plan of batch) {
                const { table, id, validFrom } = plan.row;

                const [updated] = await writeCharacteristics(
                    tx,
                    plan.row,
                    JSON.stringify(plan.afterJson),
                    plan.beforeText,
                    plan.columns
                );

                if (!updated) throw rowChanged(plan.row);

                const after = statRowHash(
                    table,
                    columnsOf(updated),
                    JSON.parse(updated.text)
                );

                if (after !== plan.beforeHash)
                    throw new Error(
                        `${rowKey(plan.row)}: contentRowHash changed after write, batch aborted`
                    );

                if (!jsonEqual(JSON.parse(updated.text), plan.afterJson))
                    throw new Error(
                        `${rowKey(plan.row)}: stored value differs from the planned one`
                    );

                out.push({
                    table,
                    id,
                    ...(validFrom === undefined ? {} : { validFrom }),
                    before: plan.beforeText,
                    after: updated.text,
                });
            }

            return out;
        }, TX_OPTIONS);

        done.push(...rows);

        write(done);
    }

    return done;
}

export async function currentTexts(
    db: RawDb,
    rows: readonly SnapshotRow[]
): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    for (const table of ['characters', 'units', 'units_base'] as const) {
        const ids = [
            ...new Set(rows.filter((r) => r.table === table).map((r) => r.id)),
        ];

        if (ids.length === 0) continue;

        const validFrom =
            table === 'units_base'
                ? Prisma.raw('"validFrom"')
                : Prisma.raw('NULL::int');

        for (const r of await db.$queryRaw<
            { id: string; validFrom: number | null; text: string }[]
        >(
            Prisma.sql`SELECT id, ${validFrom} AS "validFrom", characteristics::text AS text FROM ${TABLE_SQL[table]} WHERE id = ANY(${ids}::text[])`
        ))
            result.set(
                rowKey({
                    table,
                    id: r.id,
                    validFrom: r.validFrom ?? undefined,
                }),
                r.text
            );
    }

    return result;
}

export async function revertSnapshot(
    db: RawDb,
    s: CharacteristicsSnapshot,
    force: boolean
): Promise<{ restored: number; skipped: RevertAction[] }> {
    return db.$transaction(async (tx) => {
        const actions = revertPlan(s, await currentTexts(tx, s.rows));

        const conflicts = actions.filter((a) => a.action === 'conflict');

        if (conflicts.length > 0 && !force)
            throw new Error(
                `Conflict: ${conflicts.map((c) => snapshotKey(c.row)).join(', ')} changed after apply (--force only by owner decision)`
            );

        let restored = 0;

        for (const { row, action, current } of actions) {
            if (action !== 'restore' && action !== 'conflict') continue;

            const [updated] = await tx.$queryRaw<{ text: string }[]>(
                Prisma.sql`UPDATE ${TABLE_SQL[row.table]} SET characteristics = ${row.before}::jsonb WHERE ${keyCondition(row)} AND characteristics::text = ${current ?? row.after} RETURNING characteristics::text AS text`
            );

            if (!updated) throw rowChanged(row);

            if (updated.text !== row.before)
                throw new Error(
                    `${rowKey(row)}: restored value differs from the snapshot`
                );

            restored++;
        }

        return {
            restored,
            skipped: actions.filter(
                (a) => a.action === 'alreadyBefore' || a.action === 'missing'
            ),
        };
    }, TX_OPTIONS);
}
