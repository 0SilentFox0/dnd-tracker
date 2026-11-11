import { NextResponse } from "next/server";

import { wfrpDraftIdentitySchema } from "./wfrp-draft-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { mergeDraftGoals } from "@/lib/server/characters/draft-goals";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function patchWfrpDraft(request: Request, campaignId: string, characterId: string, access: CampaignAccessResult): Promise<NextResponse> {
  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: { campaignId: true, controlledBy: true, status: true, goals: true } }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (character instanceof NextResponse) return character;

  if (character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  if (character.status !== CharacterStatus.PENDING) return errorResponse(API_ERRORS.DRAFT_NOT_PENDING, 400);

  const data = await parseBody(wfrpDraftIdentitySchema, request);

  if (data instanceof NextResponse) return data;

  const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId });

  if (!avatar.ok) return errorResponse(avatar.message, 400, undefined, avatar.params);

  const updated = await prisma.character.update({
    where: { id: characterId },
    data: {
      name: data.name,
      alignment: data.alignment ?? null,
      background: data.background ?? null,
      goals: mergeDraftGoals(character.goals, data.goals) as never,
      avatar: avatar.avatar,
    },
  });

  return NextResponse.json(updated);
}
