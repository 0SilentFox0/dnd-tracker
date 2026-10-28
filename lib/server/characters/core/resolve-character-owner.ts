import { type NextResponse } from "next/server";

import type { CreateCharacterInput } from "./create-character-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/utils/api/api-response";

type Owner = { controlledBy: string } | { error: NextResponse };

export async function resolveCharacterOwner(campaignId: string, dmUserId: string, data: Pick<CreateCharacterInput, "type" | "controlledBy">): Promise<Owner> {
  if (data.type === CharacterType.NPC_HERO) return { controlledBy: dmUserId };

  const ownerId = data.controlledBy.trim();

  if (!ownerId) return { error: errorResponse(API_ERRORS.CHARACTER_PLAYER_REQUIRED, 400) };

  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });

  if (!owner) {
    return {
      error: errorResponse(API_ERRORS.CHARACTER_OWNER_NOT_IN_DB, 400),
    };
  }

  const membership = await prisma.campaignMember.findFirst({ where: { campaignId, userId: ownerId }, select: { id: true } });

  if (!membership) return { error: errorResponse(API_ERRORS.CHARACTER_OWNER_NOT_MEMBER, 400) };

  return { controlledBy: ownerId };
}
