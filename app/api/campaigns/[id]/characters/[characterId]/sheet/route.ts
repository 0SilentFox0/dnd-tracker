import { NextResponse } from "next/server";

import { buildSheetFor, loadSheetCharacter } from "./sheet-handler";

import { CampaignRole } from "@/lib/constants/campaigns";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const access = await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const character = await loadSheetCharacter(characterId);

    if (!character || character.campaignId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isDM = access.campaign.members[0]?.role === CampaignRole.DM;

    const isOwner = character.controlledBy === access.userId;

    if (!isDM && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(await buildSheetFor(character, { isDM, isOwner }));
  } catch (error) {
    return handleApiError(error, { action: "fetch character sheet" });
  }
}
