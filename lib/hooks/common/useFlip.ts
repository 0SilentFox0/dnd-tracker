"use client";

import { type RefObject, useLayoutEffect, useRef } from "react";

const DURATION = 320;

/** FLIP для дітей з `data-flip`: зсунуті плавно переїжджають на нове місце, нові — з'являються. */
export function useFlip(container: RefObject<HTMLElement | null>, version: unknown) {
  const last = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const root = container.current;

    if (!root) return;

    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const next = new Map<string, number>();

    const first = last.current.size === 0;

    for (const el of root.querySelectorAll<HTMLElement>("[data-flip]")) {
      const key = el.dataset.flip ?? "";

      const x = el.offsetLeft;

      next.set(key, x);

      if (first || reduce || typeof el.animate !== "function") continue;

      const prev = last.current.get(key);

      if (prev === undefined) el.animate([{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }], { duration: DURATION, easing: "ease-out" });
      else if (prev !== x) el.animate([{ transform: `translateX(${prev - x}px)` }, { transform: "none" }], { duration: DURATION, easing: "cubic-bezier(.2,.8,.2,1)" });
    }

    last.current = next;
  }, [container, version]);
}
