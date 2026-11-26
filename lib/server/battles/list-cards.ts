import { Prisma } from '@prisma/client';

import 'server-only';
import {
    BattleStatus,
    ParticipantSide,
    ParticipantSourceType,
} from '@/lib/constants/battle';
import { prisma } from '@/lib/db';
import { isPreviewSafeBackground } from '@/lib/utils/battle/grid/map-editor';
import { battleSceneListSelect } from '@/lib/utils/battle/store/scene-list-select';
import { fromJson } from '@/lib/utils/common/json';
import type {
    BattleFace,
    BattleListCardData,
    BattlePreparationParticipant,
    BattleSideSummary,
} from '@/types/battle';

const MAX_FACES = 5;

interface MapRow {
    id: string;
    bg: string | null;
    cols: number | null;
    rows: number | null;
    grid: string | null;
    maze: boolean;
    libBg: string | null;
}

interface ResultRow {
    battleId: string;
    result: string | null;
}

const emptySide = (): BattleSideSummary => ({ count: 0, faces: [] });

const mapOf = (row: MapRow | undefined): BattleListCardData['map'] => {
    if (!row || !row.cols || !row.rows) return null;

    const background = [row.bg, row.libBg].find(isPreviewSafeBackground);

    return {
        background: background ?? null,
        cols: row.cols,
        rows: row.rows,
        gridType: row.grid === 'hex' ? 'hex' : 'square',
        maze: row.maze,
    };
};

const resultOf = (value: string | null | undefined) =>
    value === 'victory' || value === 'defeat' ? value : null;

const iso = (date: Date | null) => date?.toISOString() ?? null;

async function loadMapRows(campaignId: string) {
    // data: backgrounds are skipped in SQL so base64 never crosses the wire for a thumbnail
    const rows = await prisma.$queryRaw<MapRow[]>`
      SELECT b.id,
        CASE WHEN b.map->>'background' LIKE 'data:%' THEN NULL ELSE b.map->>'background' END AS bg,
        (b.map->>'cols')::int AS cols,
        (b.map->>'rows')::int AS rows,
        b.map->>'gridType' AS grid,
        COALESCE(jsonb_typeof(b.map->'maze') = 'object', false) AS maze,
        CASE WHEN m.header->>'background' LIKE 'data:%' THEN NULL ELSE m.header->>'background' END AS "libBg"
      FROM battle_scenes b LEFT JOIN battle_maps m ON m.id = b.map_id
      WHERE b."campaignId" = ${campaignId} AND b.owner_user_id IS NULL`;

    return new Map(rows.map((r) => [r.id, r]));
}

async function loadResults(battleIds: string[]) {
    if (battleIds.length === 0) return new Map<string, string | null>();

    const rows = await prisma.$queryRaw<ResultRow[]>`
      SELECT DISTINCT ON ("battleId") "battleId", details->>'battleResult' AS result
      FROM battle_events
      WHERE "battleId" IN (${Prisma.join(battleIds)})
        AND "cancelledAt" IS NULL
        AND details->>'battleResult' IS NOT NULL
      ORDER BY "battleId", seq DESC`;

    return new Map(rows.map((r) => [r.battleId, r.result]));
}

async function loadFaces(campaignId: string, ids: BattleParticipantIds) {
    const select = { id: true, name: true, avatar: true } as const;

    const [characters, units] = await Promise.all([
        ids.character.length
            ? prisma.character.findMany({
                  where: { campaignId, id: { in: ids.character } },
                  select,
              })
            : [],
        ids.unit.length
            ? prisma.unit.findMany({
                  where: { campaignId, id: { in: ids.unit } },
                  select,
              })
            : [],
    ]);

    return new Map<string, BattleFace>(
        [...characters, ...units].map((e) => [e.id, e])
    );
}

interface BattleParticipantIds {
    character: string[];
    unit: string[];
}

function summarizeSides(
    participants: BattlePreparationParticipant[],
    faces: Map<string, BattleFace>
) {
    const sides = { ally: emptySide(), enemy: emptySide() };

    for (const p of participants) {
        const side =
            p.side === ParticipantSide.ENEMY ? sides.enemy : sides.ally;

        side.count += p.quantity ?? 1;

        const face = faces.get(p.id);

        if (face && side.faces.length < MAX_FACES) side.faces.push(face);
    }

    return sides;
}

export async function loadBattleListCards(
    campaignId: string
): Promise<BattleListCardData[]> {
    const battles = await prisma.battleScene.findMany({
        where: { campaignId, ownerUserId: null },
        orderBy: { createdAt: 'desc' },
        select: battleSceneListSelect,
    });

    const parsed = battles.map((b) => ({
        battle: b,
        participants: Array.isArray(b.participants)
            ? fromJson<BattlePreparationParticipant[]>(b.participants)
            : [],
    }));

    const ids: BattleParticipantIds = { character: [], unit: [] };

    for (const { participants } of parsed)
        for (const p of participants)
            ids[
                p.type === ParticipantSourceType.CHARACTER ? 'character' : 'unit'
            ].push(p.id);

    const completed = battles
        .filter((b) => b.status === BattleStatus.COMPLETED)
        .map((b) => b.id);

    const [maps, results, faces] = await Promise.all([
        loadMapRows(campaignId),
        loadResults(completed),
        loadFaces(campaignId, ids),
    ]);

    return parsed.map(({ battle, participants }) => ({
        id: battle.id,
        name: battle.name,
        description: battle.description,
        status: battle.status as BattleListCardData['status'],
        currentRound: battle.currentRound,
        createdAt: battle.createdAt.toISOString(),
        startedAt: iso(battle.startedAt),
        completedAt: iso(battle.completedAt),
        map: mapOf(maps.get(battle.id)),
        sides: summarizeSides(participants, faces),
        result: resultOf(results.get(battle.id)),
    }));
}
