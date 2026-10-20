"use client";

import { useEffect, useState } from "react";

import { SLIDE_CROSSFADE_MS } from "@/lib/constants/show";
import type { Slide } from "@/types/show";

type Layer = { slide: Slide; leaving: boolean };

export function useSlideLayers(slide: Slide | null): Layer[] {
  const [current, setCurrent] = useState(slide);

  const [leaving, setLeaving] = useState<Slide | null>(null);

  if (slide?.id !== current?.id || slide?.imageUrl !== current?.imageUrl) {
    setLeaving(current && current.imageUrl !== slide?.imageUrl ? current : null);
    setCurrent(slide);
  } else if (slide !== current) {
    setCurrent(slide);
  }

  useEffect(() => {
    if (!leaving) return;

    const timer = setTimeout(() => setLeaving(null), SLIDE_CROSSFADE_MS + 100);

    return () => clearTimeout(timer);
  }, [leaving]);

  return [...(leaving ? [{ slide: leaving, leaving: true }] : []), ...(current ? [{ slide: current, leaving: false }] : [])];
}
