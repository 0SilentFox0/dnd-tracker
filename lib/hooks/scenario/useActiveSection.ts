"use client";

import { useEffect, useState } from "react";

export function pickActiveSection(tops: { id: string; top: number }[], line: number): string | null {
  if (!tops.length) return null;

  let active = tops[0].id;

  for (const t of tops) if (t.top <= line) active = t.id;

  return active;
}

const stickyLine = () => {
  const style = getComputedStyle(document.querySelector(".scenario-book") ?? document.documentElement);

  const px = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;

  return px("--app-header-h") + px("--sb-bar-h") + px("--sb-toolbar-h") + 24;
};

/** Поточний розділ — останній, чий верх пройшов лінію під липкою шапкою. */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  const key = ids.join(",");

  useEffect(() => {
    const list = key ? key.split(",") : [];

    let frame = 0;

    const update = () => {
      frame = 0;

      const tops = list.flatMap((id) => {
        const el = document.getElementById(`sec-${id}`);

        return el ? [{ id, top: el.getBoundingClientRect().top }] : [];
      });

      setActive(pickActiveSection(tops, stickyLine()));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);

  return active;
}
