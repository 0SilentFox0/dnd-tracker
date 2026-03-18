/**
 * Хелпер для API routes бою: перевірка доступу до кампанії + завантаження battle з типізованим initiativeOrder.
 * Усуває дублювання патерну requireCampaignAccess → findUnique → cast у battle routes.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import type { BattleParticipant } from "@/types/battle";

type BattleSceneFromDb = NonNullable<
  Awaited<ReturnType<typeof prisma.battleScene.findUnique>>
>;

export type BattleWithAccess = {
  accessResult: CampaignAccessResult;
  battle: BattleSceneFromDb;
  initiativeOrder: BattleParticipant[];
};

/**
 * Перевіряє доступ до кампанії та завантажує сцену бою.
 * @returns BattleWithAccess або NextResponse з помилкою (401, 403, 404)
 */
export async function getBattleWithAccess(
  campaignId: string,
  battleId: string,
  options?: { requireDM?: boolean },
): Promise<BattleWithAccess | NextResponse> {
  const accessResult = await requireCampaignAccess(
    campaignId,
    options?.requireDM ?? false,
  );

  if (accessResult instanceof NextResponse) {
    return accessResult;
  }

  const battle = await prisma.battleScene.findUnique({
    where: { id: battleId },
  });

  if (!battle || battle.campaignId !== campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const initiativeOrder = (battle.initiativeOrder ?? []) as unknown as BattleParticipant[];

  return {
    accessResult,
    battle: battle as BattleSceneFromDb,
    initiativeOrder,
  };
}
