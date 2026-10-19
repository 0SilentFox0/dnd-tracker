"use client";

import { useEffect, useState } from "react";

import type { ImageSize } from "@/lib/utils/battle/grid";

/** Природний розмір зображення за src; null, поки не завантажилось чи без src. */
export function useImageSize(src: string | null): ImageSize | null {
  const [loaded, setLoaded] = useState<{ src: string; size: ImageSize } | null>(null);

  useEffect(() => {
    if (!src) return;

    let live = true;

    const img = new window.Image();

    img.onload = () => {
      if (live && img.naturalWidth > 0 && img.naturalHeight > 0) setLoaded({ src, size: { width: img.naturalWidth, height: img.naturalHeight } });
    };
    img.src = src;

    return () => {
      live = false;
    };
  }, [src]);

  return loaded && loaded.src === src ? loaded.size : null;
}
