import { z } from "zod";

import { DECK_TITLE_MAX, MAX_SLIDE_BYTES, MAX_SLIDES_PER_DECK, SLIDE_CAPTION_MAX, SLIDE_TITLE_MAX, SLIDE_UPLOAD_TYPES } from "@/lib/constants/show";
import { battleAudioCommandSchema } from "@/lib/schemas/music";
import type { Slide } from "@/types/show";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const slideIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

const imageUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((v) => v.startsWith("https://") || v.startsWith("http://"), "Потрібне посилання http(s)");

const slideSchema = z.object({
  id: slideIdSchema,
  imageUrl: imageUrlSchema,
  title: optionalText(SLIDE_TITLE_MAX),
  caption: optionalText(SLIDE_CAPTION_MAX),
  trackId: z.string().min(1).max(64).optional(),
});

export const slidesSchema = z
  .array(slideSchema)
  .max(MAX_SLIDES_PER_DECK)
  .refine((slides) => new Set(slides.map((s) => s.id)).size === slides.length, "Повторюваний id слайда");

const deckTitleSchema = z.string().trim().min(1).max(DECK_TITLE_MAX);

export const createDeckSchema = z.object({ title: deckTitleSchema });

export const saveDeckSchema = z.object({ title: deckTitleSchema, slides: slidesSchema, expectedUpdatedAt: z.string().datetime() });

export const slideUploadRequestSchema = z.object({
  size: z.number().int().positive().max(MAX_SLIDE_BYTES),
  contentType: z.enum(SLIDE_UPLOAD_TYPES),
});

export const showCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), deckId: z.string().min(1).max(64), slideId: slideIdSchema.optional() }),
  z.object({ action: z.literal("next") }),
  z.object({ action: z.literal("prev") }),
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("audio"), command: battleAudioCommandSchema }),
  z.object({ action: z.literal("battle"), battleId: z.string().min(1).max(64) }),
  z.object({ action: z.literal("curtain"), on: z.boolean() }),
  z.object({ action: z.literal("setCover"), deckId: z.string().min(1).max(64), slideId: slideIdSchema }),
  z.object({ action: z.literal("clearCover") }),
]);

export const deckSceneSchema = z.object({ scenarioPageId: z.string().min(1).max(64).nullable() });

export function readSlides(json: unknown): Slide[] {
  const parsed = slidesSchema.safeParse(json);

  return parsed.success ? parsed.data : [];
}
