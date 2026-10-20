"use client";

import { useEffect } from "react";

import type { ShowControl } from "./useShowControl";

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useShowKeys(control: ShowControl | null): void {
  useEffect(() => {
    if (!control) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      if (e.altKey || e.ctrlKey || e.metaKey || (target && (TYPING.has(target.tagName) || target.isContentEditable))) return;

      if (e.key === "ArrowRight") void control.send({ action: "next" });

      if (e.key === "ArrowLeft") void control.send({ action: "prev" });
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [control]);
}
