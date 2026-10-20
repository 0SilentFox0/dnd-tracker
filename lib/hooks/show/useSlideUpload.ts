"use client";

import { useCallback, useState } from "react";

import { uploadSlideImage } from "@/lib/api/decks";
import { resizeSlideImage } from "@/lib/utils/show/resize-image";
import type { Slide } from "@/types/show";

const PARALLEL = 3;

const newSlideId = () => `slide-${crypto.randomUUID()}`;

/** Файли вантажаться по три паралельно; невдалі пропускаються, їхні помилки — у onError. */
export function useSlideUpload(campaignId: string, onError: (message: string) => void) {
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
            slides[i] = { id: newSlideId(), imageUrl: await uploadSlideImage(campaignId, await resizeSlideImage(files[i])) };
          } catch (e) {
            onError(`${files[i].name}: ${e instanceof Error ? e.message : "помилка"}`);
          }

          done += 1;
          setProgress({ done, total: files.length });
        }
      };

      await Promise.all(Array.from({ length: Math.min(PARALLEL, files.length) }, worker));

      setProgress(null);

      return slides.filter((s): s is Slide => s !== null);
    },
    [campaignId, onError],
  );

  return { upload, progress, newSlideId };
}
