import { NextResponse } from "next/server";
import { APICallError, generateObject } from "ai";
import { z } from "zod";

import { pickDmTextModel } from "@/lib/ai/dm-model";
import { aiErrorMessage } from "@/lib/ai/errors";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignRole } from "@/lib/constants/campaigns";
import { ACTIVE_CHARACTER, GoalKind } from "@/lib/constants/characters";
import { HERO_ARCHETYPE_KEYS, heroArchetype } from "@/lib/constants/hero-archetypes";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseBody } from "@/lib/utils/api/parse-body";
import { AI_PLAYER_RATE_LIMIT, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";

const requestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  race: z.string().max(100),
  archetype: z.enum(HERO_ARCHETYPE_KEYS),
  class: z.string().max(100),
  background: z.string().max(4000).optional(),
});

const resultSchema = z.object({
  background: z.string().max(2500),
  goals: z
    .array(z.object({ text: z.string().max(300), kind: z.enum([GoalKind.MAIN, GoalKind.PERSONAL, GoalKind.INNER, GoalKind.SECRET]) }))
    .min(1)
    .max(3),
});

export async function readBackstoryAvailability(campaignId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  return NextResponse.json({ available: !!(await pickDmTextModel(campaignId)) });
}

export async function generateBackstory(request: Request, campaignId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  if (!access.isDM) {
    const role = access.campaign.members.find((m) => m.userId === access.userId)?.role;

    const hasActive = await prisma.character.count({ where: { campaignId, controlledBy: access.userId, ...ACTIVE_CHARACTER } });

    if (role !== CampaignRole.PLAYER || hasActive > 0) return errorResponse(API_ERRORS.FORBIDDEN, 403);
  }

  const data = await parseBody(requestSchema, request);

  if (data instanceof NextResponse) return data;

  const limit = await checkRateLimit({ userId: access.userId, scope: "draft-backstory", battleId: campaignId, ...AI_PLAYER_RATE_LIMIT });

  if (!limit.allowed) return rateLimitResponse(limit);

  const model = await pickDmTextModel(campaignId);

  if (!model) return errorResponse(API_ERRORS.AI_NOT_CONFIGURED_FOR_PLAYERS, 400);

  try {
    const { object } = await generateObject({
      model,
      schema: resultSchema,
      prompt: [
        "Ти допомагаєш гравцю D&D-кампанії у світі Heroes of Might and Magic V.",
        `Напиши українською передісторію (3–5 речень, без механіки й чисел) і 2–3 цілі для героя: ${data.name}, раса «${data.race}», клас «${data.class}», архетип «${heroArchetype(data.archetype).name}».`,
        data.background ? `Збережи суть чернетки гравця: ${data.background}` : "",
      ].join("\n"),
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("[ai backstory]", APICallError.isInstance(error) ? error.statusCode : error instanceof Error ? error.name : "unknown");

    return errorResponse(aiErrorMessage(error), 502);
  }
}
