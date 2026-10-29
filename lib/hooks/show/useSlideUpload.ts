"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { uploadSlideImage } from "@/lib/api/decks";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { SLIDE_MAX_EDGE_PX } from "@/lib/constants/show";
import { ImageResizeError, resizeImageToBlob } from "@/lib/utils/common/image-resize";
import { newSlideId } from "@/lib/utils/show/deck-draft";
import type { Slide } from "@/types/show";

const PARALLEL = 3;

export function useSlideUpload(campaignId: string, onError: (message: string) => void) {
  const t = useTranslations();

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const upload = useCallback(
    async (files: File[]): Promise<Slide[]> => {
      const slides: (Slide | null)[] = new Array(files.length).fill(null);

      let next = 0;

      let done = 0;

      setProgress({ done, total: files.length });

      const worker = async () => {
        while (next < files.length) {
          const i = next++;

          try {
            slides[i] = { id: newSlideId(), imageUrl: await uploadSlideImage(campaignId, await resizeImageToBlob(files[i], SLIDE_MAX_EDGE_PX), (message) => t(API_ERRORS.IMAGE_UPLOAD_FAILED, { message })) };
          } catch (e) {
            onError(t("show.errors.uploadFile", { name: files[i].name, message: e instanceof ImageResizeError ? t(e.key) : e instanceof Error ? e.message : t("show.errors.uploadUnknown") }));
          }

          done += 1;
          setProgress({ done, total: files.length });
        }
      };

      await Promise.all(Array.from({ length: Math.min(PARALLEL, files.length) }, worker));

      setProgress(null);

      return slides.filter((s): s is Slide => s !== null);
    },
    [campaignId, onError, t],
  );

  return { upload, progress };
}
