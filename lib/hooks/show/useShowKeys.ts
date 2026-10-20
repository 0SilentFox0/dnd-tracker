"use client";

import { useEffect, useRef } from "react";

import type { ShowControl } from "./useShowControl";

import type { ShowCommand } from "@/types/show";

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

const DIALOG = '[role="dialog"]';

const ARROWS: Record<string, ShowCommand> = { ArrowRight: { action: "next" }, ArrowLeft: { action: "prev" } };

export function useShowKeys(control: ShowControl | null): void {
  const inFlight = useRef(false);

  useEffect(() => {
    if (!control) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      const cmd = ARROWS[e.key];

      if (!cmd || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      if (target && (TYPING.has(target.tagName) || target.isContentEditable || target.closest?.(DIALOG))) return;

      if (document.querySelector(DIALOG)) return;

      e.preventDefault();

      if (e.repeat || inFlight.current || control.pending) return;

      inFlight.current = true;
      void control.send(cmd).finally(() => (inFlight.current = false));
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [control]);
}
