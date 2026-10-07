import { NextResponse } from "next/server";

import { CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";

const COMPACT_SELECT = {
  id: true,
  campaignId: true,
  type: true,
  controlledBy: true,
  name: true,
  level: true,
  class: true,
  race: true,
  avatar: true,
} as const;

const LIST_SELECT = {
  ...COMPACT_SELECT,
  subrace: true,
  strength: true,
  hpMultiplier: true,
  armorClass: true,
  initiative: true,
  experience: true,
  user: { select: { displayName: true } },
} as const;

export async function listCharacters(request: Request, campaignId: string): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type");

  const compact = searchParams.get("compact") === "1" || searchParams.get("compact") === "true";

  const accessResult = await requireCampaignAccess(campaignId, false);

  if (accessResult instanceof NextResponse) return accessResult;

  const where: { campaignId: string; type?: CharacterTypeValue } = { campaignId };

  if (type === CharacterType.PLAYER || type === CharacterType.NPC_HERO) where.type = type;

  const orderBy = { createdAt: "desc" } as const;

  const characters = compact
    ? await prisma.character.findMany({ where, select: COMPACT_SELECT, orderBy })
    : await prisma.character.findMany({ where, select: LIST_SELECT, orderBy });

  return NextResponse.json(characters);
}
