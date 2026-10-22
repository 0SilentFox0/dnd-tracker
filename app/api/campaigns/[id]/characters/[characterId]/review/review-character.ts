import { NextResponse } from "next/server";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";

const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("return"), note: z.string().trim().min(1).max(1000) }),
]);

export async function reviewCharacter(request: Request, campaignId: string, characterId: string): Promise<NextResponse> {
  const access = await requireDM(campaignId);

  if (access instanceof NextResponse) return access;

  const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: { campaignId: true, status: true } }), campaignId, API_ERRORS.CHARACTER_NOT_FOUND);

  if (character instanceof NextResponse) return character;

  const data = await parseBody(reviewSchema, request);

  if (data instanceof NextResponse) return data;

  if (data.action === "return" && character.status !== CharacterStatus.PENDING) return errorResponse(API_ERRORS.REVIEW_NOT_PENDING, 400);

  const updated = await prisma.character.update({
    where: { id: characterId },
    data: data.action === "approve" ? { status: CharacterStatus.ACTIVE, reviewNote: null } : { reviewNote: data.note },
    select: { id: true, status: true, reviewNote: true },
  });

  return NextResponse.json(updated);
}
