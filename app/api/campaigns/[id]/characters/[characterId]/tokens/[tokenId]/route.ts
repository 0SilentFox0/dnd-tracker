import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; characterId: string; tokenId: string }> }) {
  try {
    const { id, characterId, tokenId } = await params;

    const access = await requireCampaignAccess(id, true);

    if (access instanceof NextResponse) return access;

    const token = await prisma.characterToken.findUnique({ where: { id: tokenId }, select: { characterId: true, character: { select: { campaignId: true } } } });

    if (!token || token.characterId !== characterId || token.character.campaignId !== id) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    await prisma.characterToken.delete({ where: { id: tokenId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "delete character token" });
  }
}
