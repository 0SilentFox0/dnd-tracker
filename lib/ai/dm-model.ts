import type { LanguageModel } from "ai";

import "server-only";
import { AiKeyUnreadableError, loadApiKey } from "@/lib/ai/credentials";
import { createModel } from "@/lib/ai/providers";
import { AI_MODELS, AI_PROVIDERS } from "@/lib/constants/ai";
import { CampaignRole } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";

// keys belong to users; a player's request runs on the campaign DM's key (fast model)
export async function pickDmTextModel(campaignId: string): Promise<LanguageModel | null> {
  const dm = await prisma.campaignMember.findFirst({ where: { campaignId, role: CampaignRole.DM }, select: { userId: true } });

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
