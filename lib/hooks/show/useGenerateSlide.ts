"use client";

import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";

import { discardGeneratedImage, generateSlideImage, type GenerateSlideImageBody } from "@/lib/api/ai";
import { AI_IMAGE_MODELS, type AiImageModelOption, type AiProvider } from "@/lib/constants/ai";
import { useAiCredentials, useAiSettings } from "@/lib/hooks/ai";

export type ImageProviderOption = { provider: AiProvider; models: AiImageModelOption[] };

export function useGenerateSlide(campaignId: string) {
  const { credentials } = useAiCredentials();

  const { instructions } = useAiSettings(campaignId);

  const providers = useMemo<ImageProviderOption[]>(
    () =>
      credentials.flatMap((c) => {
        const models = AI_IMAGE_MODELS[c.provider];

        return models?.length ? [{ provider: c.provider, models }] : [];
      }),
    [credentials],
  );

  const mutation = useMutation({ mutationFn: (body: GenerateSlideImageBody) => generateSlideImage(campaignId, body) });

  return {
    providers,
    hasInstructions: instructions.trim().length > 0,
    generate: (body: GenerateSlideImageBody) => mutation.mutateAsync(body).then((r) => r.url, () => null),
    discard: (url: string) => void discardGeneratedImage(campaignId, url).catch(() => undefined),
    pending: mutation.isPending,
    error: mutation.error?.message ?? null,
    reset: mutation.reset,
  };
}
