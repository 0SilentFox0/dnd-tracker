import { NextResponse } from "next/server";
import { z } from "zod";

import { guardDraftAi, limitDraftAi } from "../draft-ai-guard";

import { pickDmImageModel } from "@/lib/ai/dm-model";
import { AiImageError, generateAvatarImage } from "@/lib/ai/images";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { HERO_ARCHETYPE_KEYS, heroArchetype } from "@/lib/constants/hero-archetypes";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseBody } from "@/lib/utils/api/parse-body";

const requestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  race: z.string().max(100),
  archetype: z.enum(HERO_ARCHETYPE_KEYS),
  class: z.string().max(100),
});

export async function generateDraftAvatar(request: Request, campaignId: string): Promise<NextResponse> {
  const guard = await guardDraftAi(campaignId);

  if (guard instanceof NextResponse) return guard;

  const data = await parseBody(requestSchema, request);

  if (data instanceof NextResponse) return data;

  const limited = await limitDraftAi(campaignId, guard.userId, "draft-avatar");

  if (limited) return limited;

  const picked = await pickDmImageModel(campaignId);

  if (!picked) return errorResponse(API_ERRORS.AI_NOT_CONFIGURED_FOR_PLAYERS, 400);

  const prompt = `Fantasy character portrait in the style of Heroes of Might and Magic V: ${data.name}, a ${data.race} ${data.class} (${heroArchetype(data.archetype).name}). Head-and-shoulders bust, dramatic painterly lighting, no text, no letters, no watermark.`;

  try {
    return NextResponse.json(await generateAvatarImage({ campaignId, userId: picked.userId, prompt, provider: picked.provider, model: picked.model, abortSignal: request.signal }));
  } catch (error) {
    if (error instanceof AiImageError) return errorResponse(error.message, error.status);

    throw error;
  }
}
