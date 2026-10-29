"use client";

import { useCallback, useEffect } from "react";

import { useBattleScene } from "./useBattleScene";

import { isActionResult } from "@/lib/utils/battle/view";

export const ACTION_RESULT_MS = 4_000;

/** Підсумок атаки чи заклинання для кутової картки: сам зникає, щоб не заступати FX на карті. */
export function useActionResult() {
  const { result: { fx, show } } = useBattleScene();

  const action = isActionResult(fx) ? fx : null;

  useEffect(() => {
    if (!action) return;

    const id = setTimeout(() => show(null), ACTION_RESULT_MS);

    return () => clearTimeout(id);
  }, [action, show]);

  const close = useCallback(() => show(null), [show]);

  return { fx: action, close };
}
