import { Prisma } from '@prisma/client';

import type {
    DowngradeSnapshotBody,
    HistoryRow,
    SceneRow,
    StatePlan,
    StatusFilter,
    StoredRow,
} from '@/scripts/db/lib/battle-state-plan';
import type { RawDb } from '@/scripts/db/lib/raw-db';

export type { RawDb };

const TX_OPTIONS = { timeout: 120_000, maxWait: 20_000 };

export async function loadScenes(
    db: RawDb,
    filter: {
        status: StatusFilter;
        campaignIds?: readonly string[];
        sceneIds?: readonly string[];
    }
): Promise<SceneRow[]> {
    const conditions: Prisma.Sql[] = [];

    if (filter.status === 'active')
        conditions.push(Prisma.sql`s.status = 'active'`);

    if (filter.campaignIds && filter.campaignIds.length > 0)
        conditions.push(
            Prisma.sql`s."campaignId" IN (${Prisma.join(filter.campaignIds)})`
        );

    if (filter.sceneIds && filter.sceneIds.length > 0)
        conditions.push(Prisma.sql`s.id IN (${Prisma.join(filter.sceneIds)})`);

    const where =
        conditions.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
            : Prisma.empty;

    return db.$queryRaw<SceneRow[]>(
        Prisma.sql`SELECT s.id, s.name, s.status, s."campaignId", c.name AS "campaignName", s.rules::text AS rules, c.rules::text AS "campaignRules", s."currentRound" AS round, s."currentTurnIndex" AS "turnIndex", s.version, (s."pendingMoraleCheck" IS NOT NULL AND s."pendingMoraleCheck"::text <> 'null') AS "pendingMorale", (s."pendingCritChoice" IS NOT NULL AND s."pendingCritChoice"::text <> 'null') AS "pendingChoice" FROM battle_scenes s JOIN campaigns c ON c.id = s."campaignId" ${where} ORDER BY s."createdAt", s.id`
    );
}

export async function loadParticipants(
    db: RawDb,
    sceneIds: readonly string[]
): Promise<StoredRow[]> {
    if (sceneIds.length === 0) return [];

    const rows = await db.$queryRaw<
        {
            id: string;
            battleId: string;
            snapshotText: string;
            stateText: string;
            snapshotHash: string;
            isPending: boolean;
        }[]
    >(
        Prisma.sql`SELECT id, "battleId", snapshot::text AS "snapshotText", state::text AS "stateText", "snapshotHash", "isPending" FROM battle_participants WHERE "battleId" IN (${Prisma.join(sceneIds)}) ORDER BY "battleId", "orderIndex", id`
    );

    return rows.map((r) => ({
        ...r,
        snapshot: JSON.parse(r.snapshotText) as unknown,
        state: JSON.parse(r.stateText) as unknown,
    }));
}

export async function loadHistory(
    db: RawDb,
    sceneIds: readonly string[]
): Promise<HistoryRow[]> {
    if (sceneIds.length === 0) return [];

    const rows = await db.$queryRaw<
        { battleId: string; seq: number; text: string }[]
    >(
        Prisma.sql`SELECT "battleId", seq, state::text AS text FROM battle_snapshots WHERE "battleId" IN (${Prisma.join(sceneIds)}) ORDER BY "battleId", seq`
    );

    return rows.map((r) => ({ ...r, state: JSON.parse(r.text) as unknown }));
}

const changed = (what: string) =>
    new Error(`${what}: рядок змінився з часу читання`);

export async function applyStatePlan(
    db: RawDb,
    plan: StatePlan,
    write: (body: DowngradeSnapshotBody) => void
): Promise<DowngradeSnapshotBody> {
    return db.$transaction(async (tx) => {
        const body: DowngradeSnapshotBody = {
            scenes: [],
            participants: [],
            history: [],
        };

        for (const scene of plan.scenes) {
            const [bumped] = await tx.$queryRaw<{ version: number }[]>(
                Prisma.sql`UPDATE battle_scenes SET version = version + 1 WHERE id = ${scene.id} AND version = ${scene.version} RETURNING version`
            );

            if (!bumped) throw changed(`battle_scenes ${scene.id}`);

            body.scenes.push({
                id: scene.id,
                version: scene.version,
                versionAfter: bumped.version,
            });
        }

        for (const p of plan.participants) {
            const [updated] = await tx.$queryRaw<
                { snapshot: string; state: string; snapshotHash: string }[]
            >(
                Prisma.sql`UPDATE battle_participants SET snapshot = ${JSON.stringify(p.after.snapshot)}::jsonb, state = ${JSON.stringify(p.after.state)}::jsonb, "snapshotHash" = ${p.after.snapshotHash} WHERE id = ${p.id} AND "battleId" = ${p.battleId} AND snapshot::text = ${p.before.snapshot} AND state::text = ${p.before.state} RETURNING snapshot::text AS snapshot, state::text AS state, "snapshotHash"`
            );

            if (!updated) throw changed(`battle_participants ${p.id}`);

            body.participants.push({
                id: p.id,
                battleId: p.battleId,
                before: p.before,
                after: updated,
            });
        }

        for (const h of plan.history) {
            const [updated] = await tx.$queryRaw<{ state: string }[]>(
                Prisma.sql`UPDATE battle_snapshots SET state = ${JSON.stringify(h.after)}::jsonb WHERE "battleId" = ${h.battleId} AND seq = ${h.seq} AND state::text = ${h.before} RETURNING state::text AS state`
            );

            if (!updated)
                throw changed(`battle_snapshots ${h.battleId}#${h.seq}`);

            body.history.push({
                battleId: h.battleId,
                seq: h.seq,
                before: h.before,
                after: updated.state,
            });
        }

        write(body);

        return body;
    }, TX_OPTIONS);
}

export const applyDowngrade = applyStatePlan;

const diverged = (what: string) =>
    new Error(`${what}: рядок змінився після застосування, відкат скасовано`);

/** puts `before` back only where the stored text still equals `after`; any other row aborts the whole revert */
export async function revertStatePlan(
    db: RawDb,
    body: DowngradeSnapshotBody
): Promise<{ scenes: number; participants: number; history: number }> {
    return db.$transaction(async (tx) => {
        for (const scene of body.scenes) {
            const [bumped] = await tx.$queryRaw<{ version: number }[]>(
                Prisma.sql`UPDATE battle_scenes SET version = version + 1 WHERE id = ${scene.id} RETURNING version`
            );

            if (!bumped) throw changed(`battle_scenes ${scene.id}`);
        }

        for (const p of body.participants) {
            const [updated] = await tx.$queryRaw<{ id: string }[]>(
                Prisma.sql`UPDATE battle_participants SET snapshot = ${p.before.snapshot}::jsonb, state = ${p.before.state}::jsonb, "snapshotHash" = ${p.before.snapshotHash} WHERE id = ${p.id} AND "battleId" = ${p.battleId} AND snapshot::text = ${p.after.snapshot} AND state::text = ${p.after.state} AND "snapshotHash" = ${p.after.snapshotHash} RETURNING id`
            );

            if (!updated) throw diverged(`battle_participants ${p.id}`);
        }

        for (const h of body.history) {
            const [updated] = await tx.$queryRaw<{ seq: number }[]>(
                Prisma.sql`UPDATE battle_snapshots SET state = ${h.before}::jsonb WHERE "battleId" = ${h.battleId} AND seq = ${h.seq} AND state::text = ${h.after} RETURNING seq`
            );

            if (!updated)
                throw diverged(`battle_snapshots ${h.battleId}#${h.seq}`);
        }

        return {
            scenes: body.scenes.length,
            participants: body.participants.length,
            history: body.history.length,
        };
    }, TX_OPTIONS);
}
