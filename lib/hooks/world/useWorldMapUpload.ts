"use client";

import { useCallback, useState } from "react";

import { discardWorldMapUpload, uploadWorldMapImage } from "@/lib/api/world";
import { WORLD_MAP_MAX_EDGE_PX, WORLD_MAP_MAX_PIXELS } from "@/lib/constants/world";
import { fitWithin, resizeImageToBlob } from "@/lib/utils/common/image-resize";

export function useWorldMapUpload(campaignId: string) {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File): Promise<{ imageUrl: string; width: number; height: number }> => {
      if (!file.type.startsWith("image/")) throw new Error("Оберіть картинку");

      setUploading(true);

      try {
        const bitmap = await createImageBitmap(file);

        const { width, height } = fitWithin(bitmap.width, bitmap.height, WORLD_MAP_MAX_EDGE_PX, WORLD_MAP_MAX_PIXELS);

        bitmap.close();

        const imageUrl = await uploadWorldMapImage(campaignId, await resizeImageToBlob(file, WORLD_MAP_MAX_EDGE_PX, undefined, WORLD_MAP_MAX_PIXELS));

        return { imageUrl, width, height };
      } finally {
        setUploading(false);
      }
    },
    [campaignId],
  );

  const discard = useCallback((imageUrl: string) => discardWorldMapUpload(campaignId, imageUrl).catch(() => undefined), [campaignId]);

  return { upload, discard, uploading };
}
