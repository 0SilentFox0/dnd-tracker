import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";

export interface ProgressionContext {
  character: { id: string; level: number; race: string; skillTreeProgress: unknown; seenLevel: number | null; controlledBy: string };
  progressRead: Prisma.InputJsonValue | typeof Prisma.JsonNull;
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

  if (!character) return errorResponse(API_ERRORS.NOT_FOUND, 404);

  const isDM = access.isDM;

  const isOwner = character.controlledBy === access.userId;

  if (!isDM && !isOwner) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const treeRow = await prisma.skillTree.findFirst({ where: { campaignId, race: character.race } });

  const read = character.skillTreeProgress;

  return {
    character: { ...character, skillTreeProgress: read ?? {} },
    // колонка NOT NULL, але JSON-значення null можливе; умова має збігтися з прочитаним
    progressRead: read === null ? Prisma.JsonNull : (read as Prisma.InputJsonValue),
    treeRow,
    isDM,
    isOwner,
  };
}
