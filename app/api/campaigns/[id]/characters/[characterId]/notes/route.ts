import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { putNotesSchema } from "@/lib/schemas/character-notes";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const access = await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const character = await prisma.character.findUnique({ where: { id: characterId }, select: { campaignId: true, controlledBy: true } });

    if (!character || character.campaignId !== id) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    if (character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

    const parsed = await parseBody(putNotesSchema, request, "Некоректні нотатки");

    if (parsed instanceof NextResponse) return parsed;

    const updated = await prisma.character.update({ where: { id: characterId }, data: { notes: parsed.notes || null }, select: { notes: true } });

    return NextResponse.json({ notes: updated.notes });
  } catch (error) {
    return handleApiError(error, { action: "update character notes" });
  }
}
