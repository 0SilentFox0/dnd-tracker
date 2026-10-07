import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { parseGoals, putGoalsSchema } from "@/lib/schemas/character-goals";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { mergeDmGoals, mergePlayerGoals } from "@/lib/utils/characters/goals";
import type { CharacterGoal } from "@/types/characters";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const access = await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const character = await prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true, goals: true } });

    if (!character || character.campaignId !== id) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const isDM = access.isDM;

    if (!isDM && character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

    const parsed = await parseBody(putGoalsSchema, request, "Некоректні цілі");

    if (parsed instanceof NextResponse) return parsed;

    const current = parseGoals(character.goals);

    const goals: CharacterGoal[] = isDM ? mergeDmGoals(current, parsed.goals, parsed.seen) : mergePlayerGoals(current, parsed.goals);

    const updated = await prisma.character.update({ where: { id: characterId }, data: { goals: goals as unknown as Prisma.InputJsonValue }, select: { goals: true } });

    return NextResponse.json({ goals: parseGoals(updated.goals) });
  } catch (error) {
    return handleApiError(error, { action: "update character goals" });
  }
}
