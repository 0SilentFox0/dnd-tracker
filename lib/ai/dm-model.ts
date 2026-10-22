import type { LanguageModel } from "ai";

import "server-only";
import { AiKeyUnreadableError, loadApiKey } from "@/lib/ai/credentials";
import { type ImageModelChoice, pickUserImageModel } from "@/lib/ai/image-model";
import { createModel } from "@/lib/ai/providers";
import { AI_IMAGE_MODELS, AI_MODELS, AI_PROVIDERS } from "@/lib/constants/ai";
import { CampaignRole } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";

const findDm = (campaignId: string) => prisma.campaignMember.findFirst({ where: { campaignId, role: CampaignRole.DM }, select: { userId: true } });

// keys belong to users; a player's request runs on the campaign DM's key (fast model)
export async function pickDmTextModel(campaignId: string): Promise<LanguageModel | null> {
  const dm = await findDm(campaignId);

  if (!dm) return null;

  for (const provider of AI_PROVIDERS) {
    try {
      const key = await loadApiKey(dm.userId, provider);

      const model = AI_MODELS[provider].find((m) => m.tier === "fast");

      if (key && model) return createModel(provider, key, model.id);
    } catch (error) {
      if (!(error instanceof AiKeyUnreadableError)) throw error;
    }
  }

  return null;
}

export async function pickDmImageModel(campaignId: string): Promise<(ImageModelChoice & { userId: string }) | null> {
  const dm = await findDm(campaignId);

  if (!dm) return null;

  const { choice } = await pickUserImageModel(dm.userId);

  return choice && { ...choice, userId: dm.userId };
}

/** Key presence only (no decryption): one DM lookup and one credentials query for both flags. */
export async function readDmAiAvailability(campaignId: string): Promise<{ text: boolean; image: boolean }> {
  const dm = await findDm(campaignId);

  if (!dm) return { text: false, image: false };

  const keys = await prisma.aiCredential.findMany({ where: { userId: dm.userId }, select: { provider: true } });

  const has = new Set(keys.map((k) => k.provider));

  return {
    text: AI_PROVIDERS.some((p) => has.has(p) && AI_MODELS[p].some((m) => m.tier === "fast")),
    image: Object.entries(AI_IMAGE_MODELS).some(([p, models]) => has.has(p) && models.length > 0),
  };
}
