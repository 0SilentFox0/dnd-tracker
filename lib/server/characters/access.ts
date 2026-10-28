import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { type CampaignAccessResult, requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";

export type CharacterWithInventory = Prisma.CharacterGetPayload<{ include: { inventory: true } }>;

export const loadCharacterWithInventory = (characterId: string) => prisma.character.findUnique({ where: { id: characterId }, include: { inventory: true } });

const loadCharacterRow = (characterId: string) => prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true } });

async function gateCharacter<T extends { campaignId: string; controlledBy: string | null }>(
  campaignId: string,
  query: PromiseLike<T | null>,
  dmOnly: boolean,
): Promise<{ access: CampaignAccessResult; character: T } | NextResponse> {
  const access = await requireCampaignAccess(campaignId, dmOnly);

  if (access instanceof NextResponse) return access;

  const character = await loadOwned(query, campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (character instanceof NextResponse) return character;

  if (!access.isDM && character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  return { access, character };
}

export function requireCharacterAccess(campaignId: string, characterId: string, opts: { dmOnly?: boolean } = {}) {
  return gateCharacter(campaignId, loadCharacterWithInventory(characterId), !!opts.dmOnly);
}

export function requireCharacterRow(campaignId: string, characterId: string, opts: { dmOnly?: boolean } = {}) {
  return gateCharacter(campaignId, loadCharacterRow(characterId), !!opts.dmOnly);
}
