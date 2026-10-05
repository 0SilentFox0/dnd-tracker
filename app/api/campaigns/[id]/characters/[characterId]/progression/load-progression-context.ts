import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";

export interface ProgressionContext {
  character: { id: string; level: number; race: string; skillTreeProgress: unknown; seenLevel: number | null; controlledBy: string };
  treeRow: Prisma.SkillTreeGetPayload<object> | null;
  isDM: boolean;
  isOwner: boolean;
}

export async function loadProgressionContext(campaignId: string, characterId: string): Promise<ProgressionContext | NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const character = await prisma.character.findFirst({
    where: { id: characterId, campaignId },
    select: { id: true, level: true, race: true, skillTreeProgress: true, seenLevel: true, controlledBy: true },
  });

  if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isDM = access.campaign.members[0]?.role === "dm";

  const isOwner = character.controlledBy === access.userId;

  if (!isDM && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const treeRow = await prisma.skillTree.findFirst({ where: { campaignId, race: character.race } });

  return { character, treeRow, isDM, isOwner };
}
