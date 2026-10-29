import { NextResponse } from "next/server";
import { APICallError, generateObject } from "ai";
import { z } from "zod";

import { guardDraftAi, limitDraftAi } from "../draft-ai-guard";

import { pickDmTextModel, readDmAiAvailability } from "@/lib/ai/dm-model";
import { aiErrorMessage } from "@/lib/ai/errors";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { GoalKind } from "@/lib/constants/characters";
import { HERO_ARCHETYPE_KEYS } from "@/lib/constants/hero-archetypes";
import type { Locale } from "@/lib/i18n/config";
import { languageName } from "@/lib/i18n/language-name";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseBody } from "@/lib/utils/api/parse-body";

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

export function buildBackstoryPrompt(data: z.infer<typeof requestSchema>, locale: Locale): string {
  return [
    "You help a player of a D&D campaign set in the world of Heroes of Might and Magic V.",
    `Write in ${languageName(locale)}: a backstory (3-5 sentences, no mechanics or numbers) and 2-3 goals for the hero: ${data.name}, race "${data.race}", class "${data.class}", archetype "${data.archetype}".`,
    data.background ? `Keep the essence of the player's draft: ${data.background}` : "",
  ].join("\n");
}

export async function readBackstoryAvailability(campaignId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const { text, image } = await readDmAiAvailability(campaignId);

  return NextResponse.json({ available: text, image });
}

export async function generateBackstory(request: Request, campaignId: string): Promise<NextResponse> {
  const guard = await guardDraftAi(campaignId);

  if (guard instanceof NextResponse) return guard;

  const data = await parseBody(requestSchema, request);

  if (data instanceof NextResponse) return data;

  const limited = await limitDraftAi(campaignId, guard.userId, "draft-backstory");

  if (limited) return limited;

  const model = await pickDmTextModel(campaignId);

  if (!model) return errorResponse(API_ERRORS.AI_NOT_CONFIGURED_FOR_PLAYERS, 400);

  const locale = await getRequestLocale();

  try {
    const { object } = await generateObject({
      model,
      schema: resultSchema,
      prompt: buildBackstoryPrompt(data, locale),
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("[ai backstory]", APICallError.isInstance(error) ? error.statusCode : error instanceof Error ? error.name : "unknown");

    return errorResponse(aiErrorMessage(error), 502);
  }
}
