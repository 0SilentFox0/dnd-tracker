import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { deriveCharacterDefaults, EMPTY_INVENTORY } from "../derive-character-defaults";
import { draftRejection } from "./draft-rules";
import { draftSchema } from "./draft-schema";

import { CharacterStatus, CharacterType, GoalAuthor, GoalStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function createDraft(request: Request, campaignId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const data = await parseBody(draftSchema, request);

  if (data instanceof NextResponse) return data;

  const role = access.campaign.members.find((m) => m.userId === access.userId)?.role ?? "";

  const existing = await prisma.character.count({ where: { campaignId, controlledBy: access.userId, type: CharacterType.PLAYER } });

  const rejection = draftRejection({ role, existing, method: data.method, scores: data });

  if (rejection) return errorResponse(rejection, 400);

  const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId });

  if (!avatar.ok) return errorResponse(avatar.message, 400);

  const { spellSlots } = await deriveCharacterDefaults(campaignId, { level: 1, race: data.race });

  const character = await prisma.$transaction(async (tx) => {
    const created = await tx.character.create({
      data: {
        campaignId,
        type: CharacterType.PLAYER,
        status: CharacterStatus.PENDING,
        controlledBy: access.userId,
        level: 1,
        name: data.name,
        race: data.race,
        class: data.class,
        archetype: data.archetype,
        alignment: data.alignment,
        background: data.background,
        avatar: avatar.avatar ?? undefined,
        strength: data.strength,
        dexterity: data.dexterity,
        constitution: data.constitution,
        intelligence: data.intelligence,
        wisdom: data.wisdom,
        charisma: data.charisma,
        primaryAbility: data.primaryAbility ?? null,
        spellSlots,
        goals: (data.goals ?? []).map((g) => ({ id: randomUUID(), text: g.text, kind: g.kind, status: GoalStatus.ACTIVE, author: GoalAuthor.PLAYER })),
        skillTreeProgress: {},
      },
    });

    await tx.characterInventory.create({ data: { characterId: created.id, ...EMPTY_INVENTORY } });

    return created;
  });

  return NextResponse.json(character);
}
