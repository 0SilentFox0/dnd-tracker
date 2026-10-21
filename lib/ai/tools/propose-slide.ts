import { z } from "zod";

import { AiToolError, defineTool } from "./define";
import { loadPageForAi } from "./scenario-read";

import "server-only";
import { AiKeyUnreadableError, loadApiKey } from "@/lib/ai/credentials";
import { AiImageError, generateSlideImage } from "@/lib/ai/images";
import { createProposal } from "@/lib/ai/proposals";
import { AI_IMAGE_ASPECTS, AI_IMAGE_MODELS, AI_IMAGE_PROMPT_MAX, type AiProvider } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { DECK_TITLE_MAX, SLIDE_TITLE_MAX } from "@/lib/constants/show";
import { prisma } from "@/lib/db";
import { removeSlideFiles } from "@/lib/supabase/scene-slide-storage";
import { newSlideId } from "@/lib/utils/show/deck-draft";

const NO_IMAGE_KEY = "Немає ключа провайдера, що генерує зображення (OpenAI або Google) — додайте його в «AI-ключі»";

const SUMMARY_MAX = 80;

const proposeSlideSchema = z.object({
  pageId: z.string().min(1).max(40),
  prompt: z.string().trim().min(1).max(AI_IMAGE_PROMPT_MAX),
  title: z.string().trim().min(1).max(SLIDE_TITLE_MAX).optional(),
  aspect: z.enum(AI_IMAGE_ASPECTS).default("16:9"),
  deckId: z.string().min(1).max(40).optional(),
});

async function pickImageModel(userId: string): Promise<{ provider: AiProvider; model: string }> {
  let unreadable = false;

  for (const [provider, models] of Object.entries(AI_IMAGE_MODELS) as [AiProvider, { id: string }[]][]) {
    if (models.length === 0) continue;

    try {
      if (await loadApiKey(userId, provider)) return { provider, model: models[0].id };
    } catch (error) {
      if (!(error instanceof AiKeyUnreadableError)) throw error;

      unreadable = true;
    }
  }

  throw new AiToolError(unreadable ? API_ERRORS.AI_KEY_UNREADABLE : NO_IMAGE_KEY);
}

async function resolveDeck(campaignId: string, pageId: string, deckId: string | undefined) {
  const select = { id: true, title: true } as const;

  if (deckId) {
    const deck = await prisma.slideDeck.findFirst({ where: { id: deckId, campaignId }, select });

    if (!deck) throw new AiToolError(`Набору ${deckId} немає в цій кампанії`);

    return deck;
  }

  return prisma.slideDeck.findFirst({ where: { campaignId, scenarioPageId: pageId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select });
}

export const proposeSceneSlideTool = defineTool({
  name: "propose_scene_slide",
  title: "Згенерувати картинку для сцени",
  description:
    "Generate an image for a scene and propose adding it as a slide to that scene's show deck; the DM previews it and applies or rejects it. Describe the visual concretely in the prompt (setting, light, mood, characters). Generation costs money on the DM's own key — call only when the DM asks for an image. deckId is optional: by default the scene's first deck is used (or a new one is created on apply).",
  input: proposeSlideSchema,
  handler: async (ctx, { pageId, prompt, title, aspect, deckId }) => {
    if (ctx.usage && ctx.usage.images >= 1) throw new AiToolError(API_ERRORS.AI_ONE_IMAGE_PER_REQUEST);

    const page = await loadPageForAi(ctx.campaignId, pageId);

    const deck = await resolveDeck(ctx.campaignId, page.id, deckId);

    const { provider, model } = await pickImageModel(ctx.userId);

    if (ctx.usage) ctx.usage.images += 1;

    let url: string;

    try {
      ({ url } = await generateSlideImage({ campaignId: ctx.campaignId, userId: ctx.userId, prompt, provider, model, aspect, useCampaignStyle: true, abortSignal: ctx.abortSignal }));
    } catch (error) {
      if (error instanceof AiImageError) throw new AiToolError(error.message);

      throw error;
    }

    let proposal: Awaited<ReturnType<typeof createProposal>>;

    try {
      proposal = await createProposal(ctx, page.id, (title ?? prompt).slice(0, SUMMARY_MAX), [
        { op: "addSlide", deckId: deck?.id ?? null, ...(deck ? { deckTitle: deck.title.slice(0, DECK_TITLE_MAX) } : {}), slide: { id: newSlideId(), imageUrl: url, ...(title ? { title } : {}) } },
      ]);
    } catch (error) {
      await removeSlideFiles(ctx.campaignId, [url]);

      throw error;
    }

    return { proposalId: proposal.id, status: "pending", note: "ДМ побачить прев'ю і додасть слайд" };
  },
});
