import { NextResponse } from "next/server";

import { buildSheetFor, loadSheetCharacter } from "./sheet-handler";

import { CampaignRole } from "@/lib/constants/campaigns";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export type KnownAccess = { userId: string; isDM: boolean; maxLevel: number };

/** `GET …/sheet` with its access rules; the profile pages reuse it for the first HTML (`known` skips the repeated membership query). */
export async function readCharacterSheet({ id, characterId, known }: { id: string; characterId: string; known?: KnownAccess }): Promise<NextResponse> {
  try {
    const access = known ? null : await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const character = await loadSheetCharacter(characterId);

    if (!character || character.campaignId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = known?.userId ?? access?.userId;

    const isDM = known ? known.isDM : access?.campaign.members[0]?.role === CampaignRole.DM;

    const isOwner = character.controlledBy === userId;

    if (!isDM && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(await buildSheetFor(character, { isDM, isOwner }, (known?.maxLevel ?? access?.campaign.maxLevel) as number));
  } catch (error) {
    return handleApiError(error, { action: "fetch character sheet" });
  }
}
