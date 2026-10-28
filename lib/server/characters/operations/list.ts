import { NextResponse } from "next/server";

import { guardedCharacterHandler,operationAccess } from "../operation-context";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus, type CharacterStatusValue, CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/utils/api/actor";
import { errorResponse } from "@/lib/utils/api/api-response";

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
  constitution: true,
  archetype: true,
  classes: true,
  armorClass: true,
  initiative: true,
  experience: true,
  inspiration: true,
  resources: true,
  user: { select: { displayName: true } },
} as const;

async function listCharactersImpl(request: Request, campaignId: string, actor?: Actor): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type");

  const compact = searchParams.get("compact") === "1" || searchParams.get("compact") === "true";

  const accessResult = await operationAccess(campaignId, false, actor);

  if (accessResult instanceof NextResponse) return accessResult;

  const pending = searchParams.get("status") === CharacterStatus.PENDING;

  if (pending && !accessResult.isDM) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const where: { campaignId: string; status: CharacterStatusValue; type?: CharacterTypeValue } = {
    campaignId,
    status: pending ? CharacterStatus.PENDING : CharacterStatus.ACTIVE,
  };

  if (type === CharacterType.PLAYER || type === CharacterType.NPC_HERO) where.type = type;

  const orderBy = { createdAt: "desc" } as const;

  const characters = compact
    ? await prisma.character.findMany({ where, select: COMPACT_SELECT, orderBy })
    : await prisma.character.findMany({ where, select: pending ? { ...LIST_SELECT, reviewNote: true } : LIST_SELECT, orderBy });

  return NextResponse.json(characters);
}

export const listCharacters = guardedCharacterHandler(listCharactersImpl, "list");
