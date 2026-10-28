import { NextResponse } from "next/server";

import { requireCharacterSelect } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { putNotesSchema } from "@/lib/schemas/character-notes";
import { errorResponse } from "@/lib/utils/api/api-response";

export const notesOperation = defineCharacterOperation({
  name: "notes",
  action: "update character notes",
  schema: putNotesSchema,
  parseMessage: "Некоректні нотатки",
  gate: async ctx => {
    const gate = await requireCharacterSelect(ctx.campaignId, ctx.characterId, { campaignId: true, controlledBy: true }, { ...gateOptions(ctx), notFound: API_ERRORS.NOT_FOUND, foreign404: true });

    if (gate instanceof NextResponse) return gate;

    if (gate.character.controlledBy !== gate.access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

    return { ...gate, characterId: ctx.characterId };
  },
  run: async ({ characterId }, parsed) => {
    const updated = await prisma.character.update({ where: { id: characterId }, data: { notes: parsed.notes || null }, select: { notes: true } });

    return { notes: updated.notes };
  },
});

export const PUT = characterRoute(notesOperation);
