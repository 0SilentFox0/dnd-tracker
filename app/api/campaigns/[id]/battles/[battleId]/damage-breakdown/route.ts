import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import {
  computeDamageBreakdown,
  computeDamageBreakdownMultiTarget,
} from "@/lib/utils/battle/battle-damage-breakdown";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const schema = z.object({
  attackerId: z.string(),
  targetId: z.string().optional(),
  targetIds: z.array(z.string()).optional(),
  attackId: z.string().optional(),
  damageRolls: z.array(z.number()),
  isCritical: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id: campaignId, battleId } = await params;

    const accessResult = await requireCampaignAccess(campaignId, false);

    if (accessResult instanceof NextResponse) return accessResult;

    const body = await request.json();

    const data = schema.parse(body);

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId, campaignId },
      select: { initiativeOrder: true },
    });

    if (!battle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    const initiativeOrder = (battle.initiativeOrder ??
      []) as unknown as BattleParticipant[];

    const attacker = initiativeOrder.find(
      (p) => p.basicInfo.id === data.attackerId,
    );

    if (!attacker) {
      return NextResponse.json(
        { error: "Attacker not found" },
        { status: 404 },
      );
    }

    const targetIdList =
      data.targetIds && data.targetIds.length > 0
        ? data.targetIds
        : data.targetId
          ? [data.targetId]
          : [];

    if (targetIdList.length === 0) {
      return NextResponse.json(
        { error: "At least one target required" },
        { status: 400 },
      );
    }

    const targets = targetIdList
      .map((id) => initiativeOrder.find((p) => p.basicInfo.id === id))
      .filter((p): p is BattleParticipant => !!p);

    if (targets.length !== targetIdList.length) {
      return NextResponse.json(
        { error: "One or more targets not found" },
        { status: 404 },
      );
    }

    const attack: BattleAttack | undefined = data.attackId
      ? attacker.battleData.attacks?.find(
          (a) => a.id === data.attackId || a.name === data.attackId,
        )
      : attacker.battleData.attacks?.[0];

    if (!attack) {
      return NextResponse.json(
        { error: "Attack not found" },
        { status: 404 },
      );
    }

    if (targets.length > 1) {
      const result = computeDamageBreakdownMultiTarget({
        attacker,
        targets,
        attack,
        damageRolls: data.damageRolls,
        allParticipants: initiativeOrder,
        isCritical: data.isCritical,
      });
      return NextResponse.json(result);
    }

    const result = computeDamageBreakdown({
      attacker,
      target: targets[0],
      attack,
      damageRolls: data.damageRolls,
      allParticipants: initiativeOrder,
      isCritical: data.isCritical,
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    console.error("Damage breakdown error:", err.message, err.stack);

    return NextResponse.json(
      { error: err.message || "Failed to compute damage breakdown" },
      { status: 500 },
    );
  }
}
