import { NextResponse } from "next/server";

import { buildSheetFor, loadSheetCharacter } from "./sheet-handler";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { Ruleset } from "@/lib/utils/rules";

export type KnownAccess = { userId: string; isDM: boolean; maxLevel: number; rules: Ruleset };

/** `GET …/sheet` with its access rules; the profile pages reuse it for the first HTML (`known` skips the repeated membership query). */
export async function readCharacterSheet({ id, characterId, known }: { id: string; characterId: string; known?: KnownAccess }): Promise<NextResponse> {
  try {
    const access = known ? null : await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const character = await loadSheetCharacter(characterId);

    if (!character || character.campaignId !== id) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const userId = known?.userId ?? access?.userId;

    const isDM = known ? known.isDM : access?.isDM ?? false;

    const isOwner = character.controlledBy === userId;

    if (!isDM && !isOwner) return errorResponse(API_ERRORS.FORBIDDEN, 403);

    return NextResponse.json(await buildSheetFor(character, { isDM, isOwner }, { maxLevel: (known?.maxLevel ?? access?.campaign.maxLevel) as number, rules: (known?.rules ?? access?.campaign.rules) as Ruleset }));
  } catch (error) {
    return handleApiError(error, { action: "fetch character sheet" });
  }
}
