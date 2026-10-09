import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createTokenSchema } from "@/lib/schemas/character-tokens";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const access = await requireCampaignAccess(id, true);

    if (access instanceof NextResponse) return access;

    const character = await prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true } });

    if (!character || character.campaignId !== id) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const parsed = await parseBody(createTokenSchema, request, "Некоректний жетон");

    if (parsed instanceof NextResponse) return parsed;

    const row = await prisma.characterToken.create({ data: { characterId, color: parsed.color, label: parsed.label, createdBy: access.userId } });

    return NextResponse.json({ token: { id: row.id, color: row.color, label: row.label, createdAt: row.createdAt.toISOString() } }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create character token" });
  }
}
