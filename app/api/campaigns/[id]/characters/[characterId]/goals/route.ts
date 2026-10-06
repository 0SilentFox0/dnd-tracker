import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { parseGoals, putGoalsSchema } from "@/lib/schemas/character-goals";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { mergeDmGoals, mergePlayerGoals } from "@/lib/utils/characters/goals";
import type { CharacterGoal } from "@/types/characters";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const access = await requireCampaignAccess(id, false);

    if (access instanceof NextResponse) return access;

    const character = await prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true, goals: true } });

    if (!character || character.campaignId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isDM = access.campaign.members[0]?.role === "dm";

    if (!isDM && character.controlledBy !== access.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = putGoalsSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) return NextResponse.json({ error: "Некоректні цілі" }, { status: 400 });

    const current = parseGoals(character.goals);

    const goals: CharacterGoal[] = isDM ? mergeDmGoals(current, parsed.data.goals, parsed.data.seen) : mergePlayerGoals(current, parsed.data.goals);

    const updated = await prisma.character.update({ where: { id: characterId }, data: { goals: goals as unknown as Prisma.InputJsonValue }, select: { goals: true } });

    return NextResponse.json({ goals: parseGoals(updated.goals) });
  } catch (error) {
    return handleApiError(error, { action: "update character goals" });
  }
}
