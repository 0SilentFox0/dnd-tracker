import { NextResponse } from "next/server";

import { mergeDraftGoals } from "./draft-data";
import { wfrpDraftSchema } from "./wfrp-draft-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignRole } from "@/lib/constants/campaigns";
import { CharacterStatus, CharacterType, HERO_INITIATIVE } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { EMPTY_INVENTORY } from "@/lib/server/characters/core/derive-character-defaults";
import { lockPlayerDrafts } from "@/lib/server/characters/draft-lock";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import { type CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { parseProfile } from "@/lib/utils/rules/systems/schemas";

type Campaign = CampaignAccessResult["campaign"];

export async function createWfrpDraft(request: Request, campaign: Campaign, access: CampaignAccessResult): Promise<NextResponse> {
  const creation = ruleSystemOf(campaign.rules).creation;

  if (!creation) return errorResponse(API_ERRORS.SYSTEM_DRAFTS_UNSUPPORTED, 409);

  const campaignId = campaign.id;

  const data = await parseBody(wfrpDraftSchema, request);

  if (data instanceof NextResponse) return data;

  const role = campaign.members.find((m) => m.userId === access.userId)?.role ?? "";

  const ownDrafts = { campaignId, controlledBy: access.userId, type: CharacterType.PLAYER };

  const reject = (existing: number) => (role !== CampaignRole.PLAYER ? API_ERRORS.DRAFT_PLAYERS_ONLY : existing > 0 ? API_ERRORS.DRAFT_ALREADY_EXISTS : null);

  const early = reject(await prisma.character.count({ where: ownDrafts }));

  if (early) return errorResponse(early, 400);

  const race = await loadOwned(prisma.race.findUnique({ where: { id: data.speciesId }, select: { campaignId: true, name: true } }), campaignId, API_ERRORS.RACE_NOT_FOUND);

  if (race instanceof NextResponse) return race;

  const [stored, careers, feats, avatar] = await Promise.all([
    prisma.raceProfile.findUnique({ where: { raceId: data.speciesId }, select: { profile: true } }),
    prisma.career.findMany({ where: { campaignId }, select: { id: true } }),
    prisma.feat.findMany({ where: { campaignId }, select: { id: true } }),
    resolveAvatarForPersistence(data.avatar, { campaignId }),
  ]);

  const profile = parseProfile(stored?.profile);

  if (!creation.isUsableProfile(profile)) return errorResponse(API_ERRORS.SPECIES_PROFILE_NOT_READY, 422);

  if (!avatar.ok) return errorResponse(avatar.message, 400, undefined, avatar.params);

  const plan = creation.planDraft(
    { career: data.career, stats: data.stats, talents: data.talents },
    { profile, rules: campaign.rules.advancement, careerIds: new Set(careers.map((c) => c.id)), featIds: new Set(feats.map((f) => f.id)) },
  );

  if (!plan.ok) return errorResponse(API_ERRORS.WFRP_DRAFT_INVALID, 400, plan.errors);

  const result = await prisma.$transaction(async (tx) => {
    await lockPlayerDrafts(tx, campaignId, access.userId);

    const rejection = reject(await tx.character.count({ where: ownDrafts }));

    if (rejection) return errorResponse(rejection, 400);

    const created = await tx.character.create({
      data: {
        name: data.name,
        race: race.name,
        class: "",
        archetype: null,
        alignment: data.alignment ?? null,
        background: data.background ?? null,
        goals: mergeDraftGoals(undefined, data.goals) as never,
        campaignId,
        type: CharacterType.PLAYER,
        status: CharacterStatus.PENDING,
        controlledBy: access.userId,
        level: 1,
        characteristics: plan.characteristics as never,
        experience: plan.experience,
        initiative: HERO_INITIATIVE.DEFAULT,
        avatar: avatar.avatar ?? undefined,
        skillTreeProgress: {},
      },
    });

    await tx.characterInventory.create({ data: { characterId: created.id, ...EMPTY_INVENTORY } });

    return created;
  });

  return result instanceof NextResponse ? result : NextResponse.json(result);
}
