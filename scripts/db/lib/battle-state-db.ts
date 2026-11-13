import { Prisma } from '@prisma/client';

import type {
    HistoryRow,
    SceneRow,
    StatusFilter,
    StoredRow,
} from '@/scripts/db/lib/battle-state-plan';
import type { RawDb } from '@/scripts/db/lib/raw-db';

export type { RawDb };

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
