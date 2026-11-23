import 'server-only';
import '@/lib/server/systems/registry';
import { BattleStatus, ParticipantSourceType } from '@/lib/constants/battle';
import { CharacterStatus, CharacterType } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
import { systemContentKinds } from '@/lib/server/systems/lookup';
import { latestPublishedVersion } from '@/lib/server/templates/publish';
import { withStoredColumns } from '@/lib/utils/rules/systems/column-view';
import type { DmDashboardData, PlayerDashboardData } from '@/types/campaigns';

export async function sourceUpdateState(
    campaignId: string
): Promise<{ sourceVersion: number; hasUpdates: boolean } | null> {
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
            createdFromId: true,
            baseSourceId: true,
            baseVersion: true,
            sourceSync: {
                select: { sourceCampaignId: true, sourceVersion: true },
            },
        },
    });

    const layered = campaign?.baseSourceId && campaign.baseVersion != null;

    const sourceId = layered ? campaign.baseSourceId : campaign?.createdFromId;

    if (!sourceId) return null;

    const source = await prisma.campaign.findUnique({
        where: { id: sourceId },
        select: { contentVersion: true },
    });

    if (!source) return null;

    if (layered)
        return {
            sourceVersion: source.contentVersion,
            hasUpdates:
                ((await latestPublishedVersion(prisma, sourceId)) ?? 0) >
                campaign.baseVersion!,
        };

    const sync = campaign!.sourceSync;

    const syncedVersion =
        sync?.sourceCampaignId === sourceId ? sync.sourceVersion : null;

    return {
        sourceVersion: source.contentVersion,
        hasUpdates:
            syncedVersion === null || source.contentVersion > syncedVersion,
    };
}

type SceneRow = {
    id: string;
    title: string;
    subtitle: string | null;
    status: string;
    playedAt: Date | null;
    sectionIds: string[];
    titles: string[];
    playedIds: string[];
};

// section ids/titles/flags are extracted in SQL so the large scene content never leaves the DB
async function readLastScene(
    campaignId: string
): Promise<DmDashboardData['latestSession']> {
    const [row] = await prisma.$queryRaw<SceneRow[]>`
        SELECT p.id, p.title, p.subtitle, p.status, p."playedAt",
            COALESCE(jsonb_path_query_array(p.content, '$.sections[*].id'), '[]'::jsonb) AS "sectionIds",
            COALESCE(jsonb_path_query_array(p.content, '$.sections[*].title'), '[]'::jsonb) AS titles,
            COALESCE(jsonb_path_query_array(p.content, '$.sections[*] ? (@.played == true).id'), '[]'::jsonb) AS "playedIds"
        FROM scenario_pages p
        WHERE p."campaignId" = ${campaignId}
            AND p.kind = 'scene'
            AND (p.status = 'played' OR jsonb_path_exists(p.content, '$.sections[*] ? (@.played == true)'))
        ORDER BY COALESCE(p."playedAt", p."updatedAt") DESC
        LIMIT 1`;

    if (!row) return null;

    const played = new Set(row.playedIds);

    const chapters = row.sectionIds.map((id, index) => ({
        id,
        title: row.titles[index] ?? '',
    }));

    const lastIndex = chapters.findLastIndex((chapter) =>
        played.has(chapter.id)
    );

    const next =
        chapters.find(
            (chapter, index) => index > lastIndex && !played.has(chapter.id)
        ) ?? chapters.find((chapter) => !played.has(chapter.id));

    return {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        playedAt: row.playedAt?.toISOString() ?? null,
        lastChapter: lastIndex >= 0 ? chapters[lastIndex] : null,
        nextChapter: next ?? null,
    };
}

const COUNT_ENTRIES = [
    ['maps', (where: Where) => prisma.battleMap.count({ where })],
    ['units', (where: Where) => prisma.unit.count({ where })],
    ['spells', (where: Where) => prisma.spell.count({ where })],
    ['artifacts', (where: Where) => prisma.artifact.count({ where })],
    ['races', (where: Where) => prisma.race.count({ where })],
    ['classes', (where: Where) => prisma.gameClass.count({ where })],
    ['backgrounds', (where: Where) => prisma.background.count({ where })],
    ['feats', (where: Where) => prisma.feat.count({ where })],
    ['careers', (where: Where) => prisma.career.count({ where })],
    ['spell-groups', (where: Where) => prisma.spellGroup.count({ where })],
] as const;

type Where = { campaignId: string };

async function readLibraryCounts(
    campaignId: string
): Promise<Record<string, number>> {
    const counts = await Promise.all([
        ...COUNT_ENTRIES.map(
            async ([key, count]) => [key, await count({ campaignId })] as const
        ),
        ...Object.entries(systemContentKinds()).flatMap(([key, { count }]) =>
            count
                ? [count(campaignId).then((value) => [key, value] as const)]
                : []
        ),
    ]);

    return Object.fromEntries(counts);
}

export async function readDmDashboard(
    campaignId: string
): Promise<DmDashboardData> {
    const [
        pendingDrafts,
        scenarioPages,
        battles,
        update,
        party,
        worldMap,
        playedScene,
        libraryCounts,
    ] = await Promise.all([
        prisma.character.count({
            where: { campaignId, status: CharacterStatus.PENDING },
        }),
        prisma.scenarioPage.findMany({
            where: {
                campaignId,
                kind: 'scene',
                status: { in: ['draft', 'ready'] },
            },
            orderBy: { updatedAt: 'desc' },
            take: 3,
            select: { id: true, title: true },
        }),
        prisma.battleScene.findMany({
            where: {
                campaignId,
                ownerUserId: null,
                status: { in: [BattleStatus.PREPARED, BattleStatus.ACTIVE] },
            },
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: { id: true, name: true, status: true },
        }),
        sourceUpdateState(campaignId),
        prisma.character.findMany({
            where: {
                campaignId,
                type: CharacterType.PLAYER,
                status: CharacterStatus.ACTIVE,
            },
            orderBy: [{ level: 'desc' }, { name: 'asc' }],
            select: {
                id: true,
                name: true,
                level: true,
                race: true,
                class: true,
                avatar: true,
                armorClass: true,
                speed: true,
                characteristics: true,
            },
        }),
        prisma.worldMap.findFirst({
            where: { campaignId, parentMarkerId: null },
            orderBy: { createdAt: 'asc' },
            select: { id: true, name: true, imageUrl: true },
        }),
        readLastScene(campaignId),
        readLibraryCounts(campaignId),
    ]);

    const activeFirst = [...battles].sort(
        (a, b) =>
            Number(b.status === BattleStatus.ACTIVE) -
            Number(a.status === BattleStatus.ACTIVE)
    );

    return {
        pendingDrafts,
        scenarioPages,
        battles: activeFirst.slice(0, 3) as DmDashboardData['battles'],
        sourceUpdate: update?.hasUpdates
            ? { sourceVersion: update.sourceVersion }
            : null,
        latestSession: playedScene,
        libraryCounts,
        party: party.map((row) => {
            const { characteristics: _characteristics, ...hero } =
                withStoredColumns(row);

            return hero;
        }),
        worldMap,
    };
}

export async function readPlayerDashboard(
    campaignId: string,
    userId: string
): Promise<PlayerDashboardData> {
    const [hasWorld, stored] = await Promise.all([
        prisma.worldMap
            .count({ where: { campaignId, parentMarkerId: null } })
            .then((n) => n > 0),
        prisma.character.findFirst({
            where: {
                campaignId,
                controlledBy: userId,
                type: CharacterType.PLAYER,
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                level: true,
                race: true,
                class: true,
                avatar: true,
                armorClass: true,
                speed: true,
                characteristics: true,
                status: true,
                reviewNote: true,
                seenLevel: true,
            },
        }),
    ]);

    if (!stored) return { hero: null, activeBattle: null, hasWorld };

    const { characteristics: _characteristics, ...hero } =
        withStoredColumns(stored);

    const participant = await prisma.battleParticipant.findFirst({
        where: {
            sourceId: hero.id,
            sourceType: ParticipantSourceType.CHARACTER,
            battle: { campaignId, status: BattleStatus.ACTIVE },
        },
        orderBy: { battle: { createdAt: 'desc' } },
        select: { battleId: true, currentHp: true, maxHp: true, tempHp: true },
    });

    return {
        hero,
        hasWorld,
        activeBattle: participant
            ? {
                  battleId: participant.battleId,
                  hp: {
                      current: participant.currentHp,
                      max: participant.maxHp,
                      temp: participant.tempHp,
                  },
              }
            : null,
    };
}
