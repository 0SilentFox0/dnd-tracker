"use client";

import { useEffect, useRef } from "react";

import type { ShowControl } from "./useShowControl";

import type { ShowCommand, ShowState } from "@/types/show";

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

const DIALOG = '[role="dialog"]';

const ARROWS: Record<string, ShowCommand> = { ArrowRight: { action: "next" }, ArrowLeft: { action: "prev" } };

export interface ShowKeysOptions {
  show?: ShowState | null;
  /** N — показати слайд наступного рядка сценарію. */
  onNextRow?: () => void;
}

/** Літери за e.code: на українській розкладці e.key для N — «т». */
function commandFor(e: KeyboardEvent, opts: ShowKeysOptions): ShowCommand | (() => void) | null {
  if (ARROWS[e.key]) return ARROWS[e.key];

  if (e.code === "KeyB") return { action: "curtain", on: !opts.show?.curtain };

  if (e.code === "KeyN" && opts.onNextRow) return opts.onNextRow;

  return null;
}

export function useShowKeys(control: ShowControl | null, options: ShowKeysOptions = {}): void {
  const inFlight = useRef(false);

  const latest = useRef({ control, options });

  const active = control !== null;

  useEffect(() => {
    latest.current = { control, options };
  });

  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      const { control, options } = latest.current;

      const cmd = commandFor(e, options);

      if (!cmd || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      if (target && (TYPING.has(target.tagName) || target.isContentEditable)) return;

      if (document.querySelector(DIALOG)) return;

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
