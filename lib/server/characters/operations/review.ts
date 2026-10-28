import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCharacterSelect } from "../access";
import { campaignGate, characterHandler, defineCharacterOperation } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";

const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("return"), note: z.string().trim().min(1).max(1000) }),
]);

export const reviewOperation = defineCharacterOperation({
  name: "review",
  action: "review character",
  schema: reviewSchema,
  gate: async ctx => {
    const access = await campaignGate(ctx);

    if (access instanceof NextResponse) return access;

    const gate = await requireCharacterSelect(ctx.campaignId, ctx.characterId, { campaignId: true, status: true }, { access });

    return gate instanceof NextResponse ? gate : { ...gate, characterId: ctx.characterId };
  },
  run: async ({ character, characterId }, data) => {
    if (data.action === "return" && character.status !== CharacterStatus.PENDING) throw new ContentError(API_ERRORS.REVIEW_NOT_PENDING, 400);

    return prisma.character.update({
      where: { id: characterId },
      data: data.action === "approve" ? { status: CharacterStatus.ACTIVE, reviewNote: null } : { reviewNote: data.note },
      select: { id: true, status: true, reviewNote: true },
    });
  },
});

export const reviewCharacter = characterHandler(reviewOperation);
