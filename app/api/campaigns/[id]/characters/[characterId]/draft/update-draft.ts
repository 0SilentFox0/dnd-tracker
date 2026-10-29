import { NextResponse } from "next/server";

import { draftChoiceFields } from "../../draft/draft-choices";
import { parseDraftBody } from "../../draft/draft-class";
import { draftFields } from "../../draft/draft-data";
import { resolveDraftParts } from "../../draft/draft-resolve";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { deriveCharacterDefaults } from "@/lib/server/characters/core/derive-character-defaults";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { storedDraftChoices } from "@/lib/utils/characters/choices/picks";
import { validateAbilityScores } from "@/lib/utils/characters/generate";
import type { CharacterClassEntry } from "@/types/classes";

export async function updateDraft(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: { campaignId: true, controlledBy: true, status: true, race: true, goals: true, skills: true, backgroundId: true, backgroundChoices: true, backgroundFeatPicks: true, raceChoices: true, feats: true, classes: true } }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (character instanceof NextResponse) return character;

  if (character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  if (character.status !== CharacterStatus.PENDING) return errorResponse(API_ERRORS.DRAFT_NOT_PENDING, 400);

  const { campaign } = access;

  const parsed = await parseDraftBody(request, campaign);

  if (parsed instanceof NextResponse) return parsed;

  const { data } = parsed;

  if (!validateAbilityScores(data, data.method)) return errorResponse(API_ERRORS.DRAFT_INVALID_SCORES, 400);

  const { avatar, asClass } = await resolveDraftParts(parsed, campaign);

  if (!avatar.ok) return errorResponse(avatar.message, 400, undefined, avatar.params);

  if (asClass && !asClass.ok) return errorResponse(asClass.error, asClass.status);

  const kept = data.choices ? undefined : storedDraftChoices(character, data.race, parsed.asClass?.classId);

  const choices = await draftChoiceFields({
    campaignId,
    rules: campaign.rules,
    data: kept ? { ...data, choices: kept } : data,
    classes: asClass?.ok ? (asClass.fields.classes as unknown as CharacterClassEntry[]) : [],
    classesById: asClass?.ok ? parsed.asClass?.classesById : undefined,
    storedSkills: character.skills,
  });

  if (choices && !choices.ok) return choices.response;

  const raceChanged = data.race !== character.race;

  const slots = asClass?.spellSlots ?? (raceChanged ? (await deriveCharacterDefaults(campaignId, { level: 1, race: data.race })).spellSlots : undefined);

  const updated = await prisma.character.update({
    where: { id: characterId },
    data: { ...draftFields(data, character.goals), ...asClass?.fields, ...(choices?.ok && choices.fields), avatar: avatar.avatar, ...(slots && { spellSlots: slots }) },
  });

  return NextResponse.json(updated);
}
