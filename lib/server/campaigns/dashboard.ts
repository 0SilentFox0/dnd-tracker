import "server-only";
import { BattleStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { CharacterStatus, CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { DmDashboardData, PlayerDashboardData } from "@/types/campaigns";

export async function readDmDashboard(campaignId: string): Promise<DmDashboardData> {
  const [pendingDrafts, scenarioPages, battles] = await Promise.all([
    prisma.character.count({ where: { campaignId, status: CharacterStatus.PENDING } }),
    prisma.scenarioPage.findMany({ where: { campaignId }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, title: true } }),
    prisma.battleScene.findMany({
      where: { campaignId, status: { in: [BattleStatus.PREPARED, BattleStatus.ACTIVE] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, status: true },
    }),
  ]);

  const activeFirst = [...battles].sort((a, b) => Number(b.status === BattleStatus.ACTIVE) - Number(a.status === BattleStatus.ACTIVE));

  return { pendingDrafts, scenarioPages, battles: activeFirst.slice(0, 3) as DmDashboardData["battles"] };
}

export async function readPlayerDashboard(campaignId: string, userId: string): Promise<PlayerDashboardData> {
  const hero = await prisma.character.findFirst({
    where: { campaignId, controlledBy: userId, type: CharacterType.PLAYER },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, level: true, race: true, class: true, avatar: true, armorClass: true, speed: true, status: true, reviewNote: true, seenLevel: true },
  });

  if (!hero) return { hero: null, activeBattle: null };

  const participant = await prisma.battleParticipant.findFirst({
    where: { sourceId: hero.id, sourceType: ParticipantSourceType.CHARACTER, battle: { campaignId, status: BattleStatus.ACTIVE } },
    orderBy: { battle: { createdAt: "desc" } },
    select: { battleId: true, currentHp: true, maxHp: true, tempHp: true },
  });

  return {
    hero,
    activeBattle: participant ? { battleId: participant.battleId, hp: { current: participant.currentHp, max: participant.maxHp, temp: participant.tempHp } } : null,
  };
}
