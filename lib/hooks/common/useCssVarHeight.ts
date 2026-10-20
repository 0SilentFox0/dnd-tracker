"use client";

import { type RefObject, useEffect } from "react";

/** Mirrors an element's height into a CSS variable on the anchor's parent: the anchor itself, or the first element matching `selector`. */
export function useCssVarHeight(anchor: RefObject<HTMLElement | null>, name: string, selector?: string) {
  useEffect(() => {
    const host = anchor.current?.parentElement;

    const el = selector ? document.querySelector<HTMLElement>(selector) : anchor.current;

    if (!host || !el) return;

    const sync = () => host.style.setProperty(name, `${el.offsetHeight}px`);

    sync();

    const observer = new ResizeObserver(sync);

    observer.observe(el);

    return () => {
      observer.disconnect();
      host.style.removeProperty(name);
    };
  }, [anchor, name, selector]);
}
