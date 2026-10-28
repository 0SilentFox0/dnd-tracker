import { z } from "zod";

import { callerOf } from "./assistant-caller";
import { defineTool } from "./define";

import "server-only";
import { AI_IMAGE_ASPECTS, AI_IMAGE_PROMPT_MAX } from "@/lib/constants/ai";
import { SLIDE_TITLE_MAX } from "@/lib/constants/show";
import { ContentError } from "@/lib/server/content/errors";



const proposeSlideSchema = z.object({
  pageId: z.string().min(1).max(40),
  prompt: z.string().trim().min(1).max(AI_IMAGE_PROMPT_MAX),
  title: z.string().trim().min(1).max(SLIDE_TITLE_MAX).optional(),
  aspect: z.enum(AI_IMAGE_ASPECTS).default("16:9"),
  deckId: z.string().min(1).max(40).optional(),
});

export const proposeSceneSlideTool = defineTool({
  name: "propose_scene_slide",
  scopes: ["show:write"],
  title: "Згенерувати картинку для сцени",
  description:
    "Generate an image for a scene and propose adding it as a slide to that scene's show deck; the DM previews it and applies or rejects it. Describe the visual concretely in the prompt (setting, light, mood, characters). Generation costs money on the DM's own key — call only when the DM asks for an image. deckId is optional: by default the scene's first deck is used (or a new one is created on apply).",
  input: proposeSlideSchema,
  handler: async (ctx) => {
    callerOf(ctx);
    // Legacy payload has no explicitRequest or trusted run claim. Never infer consent.
    throw new ContentError("Генерація потребує явного запиту, підтвердження та довіреного запуску. Відкрийте редактор показу.", 409);
  },
});
