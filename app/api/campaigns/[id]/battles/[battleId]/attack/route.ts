import { NextResponse } from "next/server";
import { z } from "zod";

import { executeAttack } from "./attack-handler";
import { attackSchema } from "./attack-schema";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import type { BattleParticipant } from "@/types/battle";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  const t0 = Date.now();

  console.info("[attack] Запит почато");
  try {
    const { id, battleId } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    console.info("[attack] auth", { ms: Date.now() - t0 });

    if (accessResult instanceof NextResponse) return accessResult;

    const { userId } = accessResult;

    const isDM = accessResult.campaign.members[0]?.role === "dm";

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    console.info("[attack] battle fetch", { ms: Date.now() - t0 });

    if (battle.status !== "active") {
      return NextResponse.json(
        { error: "Battle is not active" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const data = attackSchema.parse(body);

    const d20Roll = data.d20Roll ?? data.attackRoll;

    if (!d20Roll) {
      return NextResponse.json(
        { error: "d20Roll is required" },
        { status: 400 },
      );
    }

    const initiativeOrder =
      battle.initiativeOrder as unknown as BattleParticipant[];

    const attacker = initiativeOrder.find(
      (p) => p.basicInfo.id === data.attackerId,
    );

    if (!attacker) {
      return NextResponse.json(
        { error: "Attacker not found in battle" },
        { status: 404 },
      );
    }

    const currentParticipant = initiativeOrder[battle.currentTurnIndex];

    const canAttack =
      isDM ||
      (currentParticipant?.basicInfo.id === attacker.basicInfo.id &&
        attacker.basicInfo.controlledBy === userId);

    if (!canAttack) {
      return NextResponse.json(
        { error: "Forbidden: only DM or current turn controller can attack" },
        { status: 403 },
      );
    }

    const targetIds = data.targetIds || (data.targetId ? [data.targetId] : []);

    const result = await executeAttack({
      battle,
      battleId,
      data: {
        ...data,
        d20Roll,
        targetIds,
      },
    });

    const totalMs = Date.now() - t0;

    console.info("[attack] Запит завершено", {
      totalMs,
      targetCount: targetIds.length,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing attack:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    if (error instanceof Error) {
      const msg = error.message;

      if (msg.includes("not found") || msg.includes("Not found")) {
        return NextResponse.json({ error: msg }, { status: 404 });
      }

      if (
        msg.includes("turn") ||
        msg.includes("targets") ||
        msg.includes("already used") ||
        msg.includes("not active") ||
        msg.includes("No attack")
      ) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
