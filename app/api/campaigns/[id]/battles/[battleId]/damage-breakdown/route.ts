import { NextResponse } from "next/server";
import { z } from "zod";

import { computeDamageBreakdown } from "@/lib/utils/battle/battle-damage-breakdown";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const schema = z.object({
  attacker: z.unknown(),
  target: z.unknown(),
  attack: z.unknown(),
  damageRolls: z.array(z.number()),
  allParticipants: z.array(z.unknown()),
  isCritical: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id: campaignId } = await params;

    const accessResult = await requireCampaignAccess(campaignId, false);
    if (accessResult instanceof NextResponse) return accessResult;

    const body = await request.json();
    const data = schema.parse(body);

    const result = computeDamageBreakdown({
      attacker: data.attacker as BattleParticipant,
      target: data.target as BattleParticipant,
      attack: data.attack as BattleAttack,
      damageRolls: data.damageRolls,
      allParticipants: data.allParticipants as BattleParticipant[],
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
