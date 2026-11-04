"use client";

import { useEffect, useRef } from "react";

import type { ShowControl } from "./useShowControl";

import { shortcutBlocked } from "@/lib/hooks/common/shortcut-guard";
import type { ShowCommand } from "@/types/show";

const ARROWS: Partial<Record<string, ShowCommand>> = { ArrowRight: { action: "next" }, ArrowLeft: { action: "prev" } };

/** Літери за e.code: на українській розкладці e.key для B — «и». */
const LETTERS: Partial<Record<string, ShowCommand>> = { KeyB: { action: "curtain" } };

/** extraKeys — додаткові дії за e.code (сценарій: KeyN — наступний рядок). */
export function useShowKeys(control: ShowControl | null, extraKeys: Record<string, () => void> = {}): void {
  const inFlight = useRef(false);

  const latest = useRef({ control, extraKeys });

  const active = control !== null;

  useEffect(() => {
    latest.current = { control, extraKeys };
  });

  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      const { control, extraKeys } = latest.current;

      const cmd: ShowCommand | (() => void) | undefined = ARROWS[e.key] ?? LETTERS[e.code] ?? extraKeys[e.code];

      if (!cmd || shortcutBlocked(e)) return;

      e.preventDefault();

      if (e.repeat || inFlight.current || !control || control.pending) return;

      if (typeof cmd === "function") return cmd();

      inFlight.current = true;
      void control.send(cmd).finally(() => (inFlight.current = false));
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}
