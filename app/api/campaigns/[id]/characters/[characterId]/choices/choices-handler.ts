import { NextResponse } from "next/server";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { CharacterWithInventory } from "@/lib/server/characters/access";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { loadChoiceRefs } from "@/lib/server/characters/choices/load-refs";
import { characterClassMode, resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { choicesStateOf, withClassPicks } from "@/lib/utils/characters/choices/picks";
import type { ChoicesBody } from "@/types/choices";

export async function saveCharacterChoices(access: CampaignAccessResult, character: CharacterWithInventory, body: ChoicesBody): Promise<NextResponse> {
  if (!access.isDM && !access.campaign.allowPlayerEdit) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  if (!access.isDM && character.status === CharacterStatus.PENDING) return errorResponse(API_ERRORS.DRAFT_EDIT_VIA_DRAFT, 403);

  const inBattle = await rejectIfInActiveBattle(character.campaignId, [character.id]);

  if (inBattle) return inBattle;

  const { rules } = access.campaign;

  const refs = await loadChoiceRefs(character.campaignId, character.race, { classMode: characterClassMode(rules, choicesStateOf(character).classes) });

  return prisma.$transaction(async (tx) => {
    await lockCharacters(tx, [character.id]);

    const row = await tx.character.findUnique({ where: { id: character.id } });

    if (!row) return errorResponse(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    const before = choicesStateOf(row);

    const after = {
      raceChoices: body.raceChoices ?? before.raceChoices,
      feats: body.feats ?? before.feats,
      classes: body.classChoices ? withClassPicks(before.classes, body.classChoices) : before.classes,
    };

    const resolved = await resolveCharacterChoices({ campaignId: row.campaignId, rules, isDM: access.isDM, character: row, before, after, refs });

    if (!resolved.ok) return resolved.response;

    const updated = await tx.character.update({ where: { id: row.id }, data: resolved.fields, include: { user: { select: PUBLIC_USER_SELECT }, inventory: true }, omit: { notes: true } });

    const scores = Object.fromEntries(ABILITY_KEYS.flatMap((k) => (typeof resolved.fields[k] === "number" ? [[k, resolved.fields[k]]] : [])));

    await writeCharacterLog(tx, [{ campaignId: row.campaignId, characterId: row.id, actorUserId: access.userId, kind: CharacterLogKind.CHOICES_EDIT, data: { before, after: resolved.state, scores } }]);

    return NextResponse.json(updated);
  });
}
