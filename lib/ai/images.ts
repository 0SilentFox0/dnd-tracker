import { APICallError, generateImage, NoImageGeneratedError, RetryError } from "ai";
import sharp from "sharp";

import "server-only";
import { AiKeyUnreadableError, loadApiKey } from "@/lib/ai/credentials";
import { aiErrorMessage } from "@/lib/ai/errors";
import { createImageModel } from "@/lib/ai/providers";
import { getAiSettings } from "@/lib/ai/settings";
import { AI_IMAGE_STYLE_MAX, type AiImageAspect, type AiProvider } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { SCENE_SLIDES_BUCKET, SLIDE_MAX_EDGE_PX } from "@/lib/constants/show";
import { YEAR_CACHE_SECONDS } from "@/lib/constants/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { AVATARS_BUCKET } from "@/lib/supabase/avatar-storage";
import { ensureBucket } from "@/lib/supabase/buckets";
import { ensureSlidesBucket } from "@/lib/supabase/scene-slide-storage";

const WEBP_QUALITY = 82;

const AVATAR_MAX_EDGE_PX = 512;

// OpenAI image models ignore aspectRatio and need an explicit size
const OPENAI_SIZES: Record<AiImageAspect, string> = { "16:9": "1536x1024", "1:1": "1024x1024", "9:16": "1024x1536" };

const SAFETY_MARKER = /content_policy|moderation|safety|blocked/i;

export class AiImageError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type GenerateSlideImageInput = {
  campaignId: string;
  userId: string;
  prompt: string;
  provider: AiProvider;
  model: string;
  aspect: AiImageAspect;
  useCampaignStyle: boolean;
  abortSignal?: AbortSignal;
};

type RenderInput = GenerateSlideImageInput & { maxEdge: number };

function failure(error: unknown): AiImageError {
  if (NoImageGeneratedError.isInstance(error)) return new AiImageError(API_ERRORS.AI_IMAGE_REJECTED, 422);

  const base = RetryError.isInstance(error) ? error.lastError : error;

  if (APICallError.isInstance(base) && base.statusCode === 400 && SAFETY_MARKER.test(base.responseBody ?? "")) return new AiImageError(API_ERRORS.AI_IMAGE_REJECTED, 422);

  const message = aiErrorMessage(error);

  return new AiImageError(message, message === API_ERRORS.AI_RATE_LIMIT ? 429 : message === API_ERRORS.AI_PROVIDER_DOWN ? 502 : 400);
}

export async function composeImagePrompt(campaignId: string, prompt: string, useCampaignStyle: boolean): Promise<string> {
  if (!useCampaignStyle) return prompt;

  const { instructions } = await getAiSettings(campaignId);

  const style = instructions?.trim().slice(0, AI_IMAGE_STYLE_MAX);

  return style ? `${prompt}\n\nСтиль кампанії: ${style}` : prompt;
}

async function renderImage(input: RenderInput): Promise<Buffer> {
  let apiKey: string | null;

  try {
    apiKey = await loadApiKey(input.userId, input.provider);
  } catch (error) {
    if (error instanceof AiKeyUnreadableError) throw new AiImageError(API_ERRORS.AI_KEY_UNREADABLE, 400);

    throw error;
  }

  if (!apiKey) throw new AiImageError(API_ERRORS.AI_KEY_MISSING, 400);

  const prompt = await composeImagePrompt(input.campaignId, input.prompt, input.useCampaignStyle);

  let bytes: Uint8Array;

  try {
    const { image } = await generateImage({
      model: createImageModel(input.provider, apiKey, input.model),
      prompt,
      n: 1,
      ...(input.provider === "openai" ? { size: OPENAI_SIZES[input.aspect] as `${number}x${number}` } : { aspectRatio: input.aspect }),
      abortSignal: AbortSignal.any([AbortSignal.timeout(110_000), ...(input.abortSignal ? [input.abortSignal] : [])]),
    });

    bytes = image.uint8Array;
  } catch (error) {
    throw failure(error);
  }

  if (input.abortSignal?.aborted) throw new AiImageError(API_ERRORS.AI_PROVIDER_DOWN, 502);

  return sharp(bytes).rotate().resize({ width: input.maxEdge, height: input.maxEdge, fit: "inside", withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer();
}

async function uploadWebp(bucketName: string, campaignId: string, webp: Buffer): Promise<string> {
  const bucket = createAdminClient().storage.from(bucketName);

  const path = `${campaignId}/${crypto.randomUUID().replace(/-/g, "")}.webp`;

  const { error } = await bucket.upload(path, webp, { contentType: "image/webp", cacheControl: YEAR_CACHE_SECONDS });

  if (error) throw new AiImageError(API_ERRORS.INTERNAL, 500);

  return bucket.getPublicUrl(path).data.publicUrl;
}

export async function generateSlideImage(input: GenerateSlideImageInput): Promise<{ url: string }> {
  const webp = await renderImage({ ...input, maxEdge: SLIDE_MAX_EDGE_PX });

  const ensured = await ensureSlidesBucket(createAdminClient());

  if (!ensured.ok) throw new AiImageError(API_ERRORS.INTERNAL, 500);

  return { url: await uploadWebp(SCENE_SLIDES_BUCKET, input.campaignId, webp) };
}

export async function generateAvatarImage(input: Omit<GenerateSlideImageInput, "aspect" | "useCampaignStyle">): Promise<{ url: string }> {
  const webp = await renderImage({ ...input, aspect: "1:1", useCampaignStyle: true, maxEdge: AVATAR_MAX_EDGE_PX });

  const ensured = await ensureBucket(createAdminClient(), AVATARS_BUCKET);

  if (!ensured.ok) throw new AiImageError(API_ERRORS.INTERNAL, 500);

  return { url: await uploadWebp(AVATARS_BUCKET, input.campaignId, webp) };
}
