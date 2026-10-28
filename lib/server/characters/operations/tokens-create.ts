import { NextResponse } from "next/server";

import { requireCharacterSelect } from "../access";
import { characterRoute, defineCharacterOperation, tokenGate } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createTokenSchema } from "@/lib/schemas/character-tokens";

export const tokensCreateOperation = defineCharacterOperation({
  name: "tokens-create",
  action: "create character token",
  schema: createTokenSchema,
  parseMessage: "Некоректний жетон",
  status: 201,
  gate: async ctx => {
    const access = await tokenGate(ctx);

    if (access instanceof NextResponse) return access;

    const gate = await requireCharacterSelect(ctx.campaignId, ctx.characterId, { id: true, campaignId: true }, { access, notFound: API_ERRORS.NOT_FOUND, foreign404: true });

    return gate instanceof NextResponse ? gate : { ...gate, characterId: ctx.characterId };
  },
  run: async ({ access, characterId }, parsed) => {
    const row = await prisma.characterToken.create({ data: { characterId, color: parsed.color, label: parsed.label, createdBy: access.userId } });

    return { token: { id: row.id, color: row.color, label: row.label, createdAt: row.createdAt.toISOString() } };
  },
});

export const POST = characterRoute(tokensCreateOperation);
