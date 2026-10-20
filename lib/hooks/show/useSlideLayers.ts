"use client";

import { useCallback, useEffect, useState } from "react";

import { SLIDE_CROSSFADE_MS } from "@/lib/constants/show";
import type { Slide } from "@/types/show";

export interface SlideLayer {
  slide: Slide;
  leaving: boolean;
  /** Залишає: повна непрозорість, поки нова картинка не проявилась; нова: після onLoad. */
  visible: boolean;
}

const SETTLE_MS = SLIDE_CROSSFADE_MS + 100;

// картинка, що не завантажилась, не повинна тримати старий шар вічно
const LOAD_TIMEOUT_MS = 8_000;

export function useSlideLayers(slide: Slide | null): { layers: SlideLayer[]; onLoad: () => void } {
  const [current, setCurrent] = useState(slide);

  const [leaving, setLeaving] = useState<Slide | null>(null);

  const [loaded, setLoaded] = useState(false);

  if (slide?.id !== current?.id || slide?.imageUrl !== current?.imageUrl) {
    const sameImage = slide?.imageUrl === current?.imageUrl;

    setLeaving(current && !sameImage ? current : null);

    if (!sameImage) setLoaded(false);

    setCurrent(slide);
  } else if (slide !== current) {
    setCurrent(slide);
  }

  const ending = !current;

  useEffect(() => {
    if (!leaving) return;

    const timer = setTimeout(() => setLeaving(null), ending || loaded ? SETTLE_MS : LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [leaving, ending, loaded]);

  const onLoad = useCallback(() => setLoaded(true), []);

  const layers: SlideLayer[] = [];

  if (leaving) layers.push({ slide: leaving, leaving: true, visible: !ending });

  if (current) layers.push({ slide: current, leaving: false, visible: loaded });

  return { layers, onLoad };
}
