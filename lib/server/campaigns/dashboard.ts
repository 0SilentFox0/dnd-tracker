import 'server-only';
import { BattleStatus, ParticipantSourceType } from '@/lib/constants/battle';
import { CharacterStatus, CharacterType } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
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
        session,
    ] = await Promise.all([
        prisma.character.count({
            where: { campaignId, status: CharacterStatus.PENDING },
        }),
        prisma.scenarioPage.findMany({
            where: { campaignId },
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
            },
        }),
        prisma.worldMap.findFirst({
            where: { campaignId, parentMarkerId: null },
            orderBy: { createdAt: 'asc' },
            select: { id: true, name: true, imageUrl: true },
        }),
        prisma.worldSession.findFirst({
            where: { campaignId },
            orderBy: { startedAt: 'desc' },
            select: {
                id: true,
                name: true,
                description: true,
                startedAt: true,
                endedAt: true,
                logs: {
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                    select: {
                        toMarker: { select: { name: true } },
                        map: { select: { name: true } },
                    },
                },
            },
        }),
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
        latestSession: session
            ? {
                  id: session.id,
                  name: session.name,
                  description: session.description,
                  startedAt: session.startedAt.toISOString(),
                  endedAt: session.endedAt?.toISOString() ?? null,
                  locations: session.logs.map(
                      (log) => log.toMarker?.name ?? log.map.name
                  ),
              }
            : null,
        party,
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
