import "server-only";
import { AiKeyUnreadableError, loadApiKey } from "@/lib/ai/credentials";
import { AI_IMAGE_MODELS, type AiProvider } from "@/lib/constants/ai";

export type ImageModelChoice = { provider: AiProvider; model: string };

export async function pickUserImageModel(userId: string): Promise<{ choice: ImageModelChoice | null; unreadable: boolean }> {
  let unreadable = false;

  for (const [provider, models] of Object.entries(AI_IMAGE_MODELS) as [AiProvider, { id: string }[]][]) {
    if (models.length === 0) continue;

    try {
      if (await loadApiKey(userId, provider)) return { choice: { provider, model: models[0].id }, unreadable };
    } catch (error) {
      if (!(error instanceof AiKeyUnreadableError)) throw error;

      unreadable = true;
    }
  }

  return { choice: null, unreadable };
}
