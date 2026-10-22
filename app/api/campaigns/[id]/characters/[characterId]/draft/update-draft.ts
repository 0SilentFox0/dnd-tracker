import { NextResponse } from "next/server";

import { deriveCharacterDefaults } from "../../derive-character-defaults";
import { draftFields } from "../../draft/draft-data";
import { draftSchema } from "../../draft/draft-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { validateAbilityScores } from "@/lib/utils/characters/generate";

export async function updateDraft(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: { campaignId: true, controlledBy: true, status: true, race: true, goals: true } }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (character instanceof NextResponse) return character;

  if (character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  if (character.status !== CharacterStatus.PENDING) return errorResponse(API_ERRORS.DRAFT_NOT_PENDING, 400);

  const data = await parseBody(draftSchema, request);

  if (data instanceof NextResponse) return data;

  if (!validateAbilityScores(data, data.method)) return errorResponse(API_ERRORS.DRAFT_INVALID_SCORES, 400);

  const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId });

  if (!avatar.ok) return errorResponse(avatar.message, 400);

  const raceChanged = data.race !== character.race;

  const slots = raceChanged ? (await deriveCharacterDefaults(campaignId, { level: 1, race: data.race })).spellSlots : undefined;

  const updated = await prisma.character.update({
    where: { id: characterId },
    data: { ...draftFields(data, character.goals), avatar: avatar.avatar, ...(slots && { spellSlots: slots }) },
  });

  return NextResponse.json(updated);
}
