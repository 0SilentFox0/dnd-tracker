"use client";

import { useEffect, useRef } from "react";

const TYPING = "input, textarea, select, [contenteditable]";

const DIALOG = '[role="dialog"]';

/** P toggles the player view; matched by e.code so it works on any keyboard layout. */
export function usePlayerViewKey(onToggle: () => void, active: boolean): void {
  const latest = useRef(onToggle);

  useEffect(() => {
    latest.current = onToggle;
  });

  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyP" || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const target = e.target as HTMLElement | null;

      if (target?.closest?.(TYPING) || target?.isContentEditable) return;

      if (document.querySelector(DIALOG)) return;

      e.preventDefault();
      latest.current();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}
