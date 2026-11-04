import "server-only";
import { BattleStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { CharacterStatus, CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { DmDashboardData, PlayerDashboardData } from "@/types/campaigns";

export type SourceUpdateState = { sourceId: string; sourceVersion: number; syncedVersion: number | null; hasUpdates: boolean };

export async function sourceUpdateState(db: Pick<typeof prisma, "campaign" | "campaignSourceSync">, campaignId: string): Promise<SourceUpdateState | null> {
  const campaign = await db.campaign.findUnique({ where: { id: campaignId }, select: { createdFromId: true } });

  if (!campaign?.createdFromId) return null;

  const sourceId = campaign.createdFromId;

  const [source, sync] = await Promise.all([
    db.campaign.findUnique({ where: { id: sourceId }, select: { contentVersion: true } }),
    db.campaignSourceSync.findUnique({ where: { campaignId }, select: { sourceCampaignId: true, sourceVersion: true } }),
  ]);

  if (!source) return null;

  const syncedVersion = sync?.sourceCampaignId === sourceId ? sync.sourceVersion : null;

  return { sourceId, sourceVersion: source.contentVersion, syncedVersion, hasUpdates: syncedVersion === null || source.contentVersion > syncedVersion };
}

export async function readDmDashboard(campaignId: string): Promise<DmDashboardData> {
  const [pendingDrafts, scenarioPages, battles, update] = await Promise.all([
    prisma.character.count({ where: { campaignId, status: CharacterStatus.PENDING } }),
    prisma.scenarioPage.findMany({ where: { campaignId }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, title: true } }),
    prisma.battleScene.findMany({
      where: { campaignId, status: { in: [BattleStatus.PREPARED, BattleStatus.ACTIVE] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, status: true },
    }),
    sourceUpdateState(prisma, campaignId),
  ]);

  const activeFirst = [...battles].sort((a, b) => Number(b.status === BattleStatus.ACTIVE) - Number(a.status === BattleStatus.ACTIVE));

  return { pendingDrafts, scenarioPages, battles: activeFirst.slice(0, 3) as DmDashboardData["battles"], sourceUpdate: update?.hasUpdates ? { sourceVersion: update.sourceVersion } : null };
}

export async function readPlayerDashboard(campaignId: string, userId: string): Promise<PlayerDashboardData> {
  const [hasWorld, hero] = await Promise.all([
    prisma.worldMap.count({ where: { campaignId, parentMarkerId: null } }).then((n) => n > 0),
    prisma.character.findFirst({
    where: { campaignId, controlledBy: userId, type: CharacterType.PLAYER },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, level: true, race: true, class: true, avatar: true, armorClass: true, speed: true, status: true, reviewNote: true, seenLevel: true },
    }),
  ]);

  if (!hero) return { hero: null, activeBattle: null, hasWorld };

  const participant = await prisma.battleParticipant.findFirst({
    where: { sourceId: hero.id, sourceType: ParticipantSourceType.CHARACTER, battle: { campaignId, status: BattleStatus.ACTIVE } },
    orderBy: { battle: { createdAt: "desc" } },
    select: { battleId: true, currentHp: true, maxHp: true, tempHp: true },
  });

  return {
    hero,
    hasWorld,
    activeBattle: participant ? { battleId: participant.battleId, hp: { current: participant.currentHp, max: participant.maxHp, temp: participant.tempHp } } : null,
  };
}
