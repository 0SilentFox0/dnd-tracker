"use client";

import { useEffect, useState } from "react";

import { SLIDE_CROSSFADE_MS } from "@/lib/constants/show";
import type { Slide } from "@/types/show";

export interface SlideLayer {
  slide: Slide;
  /** Змінюється з кожним виходом шару нагору, щоб анімація появи починалась заново. */
  key: string;
  role: "top" | "under" | "ending";
}

interface Stack {
  seq: number;
  top: { slide: Slide; key: string } | null;
  under: { slide: Slide; key: string } | null;
}

const SETTLE_MS = SLIDE_CROSSFADE_MS + 100;

function advance(stack: Stack, slide: Slide | null): Stack {
  if (!slide || !stack.top) {
    if (!slide && !stack.top) return stack;
  } else if (slide.imageUrl === stack.top.slide.imageUrl) {
    return slide === stack.top.slide ? stack : { ...stack, top: { slide, key: stack.top.key } };
  }

  const seq = stack.seq + 1;

  return { seq, top: slide && { slide, key: `${slide.imageUrl}#${seq}` }, under: stack.top };
}

export function useSlideLayers(slide: Slide | null): SlideLayer[] {
  const [stack, setStack] = useState<Stack>(() => advance({ seq: 0, top: null, under: null }, slide));

  const next = advance(stack, slide);

  if (next !== stack) setStack(next);

  const { seq } = next;

  useEffect(() => {
    if (seq === 0) return;

    const timer = setTimeout(() => setStack((s) => (s.seq === seq ? { ...s, under: null } : s)), SETTLE_MS);

    return () => clearTimeout(timer);
  }, [seq]);

  const layers: SlideLayer[] = [];

  if (next.under) layers.push({ ...next.under, role: next.top ? "under" : "ending" });

  if (next.top) layers.push({ ...next.top, role: "top" });

  return layers;
}
