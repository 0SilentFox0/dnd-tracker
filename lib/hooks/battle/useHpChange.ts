"use client";

import { useEffect, useRef, useState } from "react";

import type { FxImpact } from "@/lib/utils/battle/fx";

export interface HpChange {
  delta: number;
  id: number;
  impact: FxImpact | null;
}

/** Вплив фіксується в момент зміни HP: пізніші дії не перезапускають спалах/рамку цього удару. */
export function useHpChange(hp: number, impact: FxImpact | null = null): HpChange | null {
  const [prev, setPrev] = useState(hp);

  const [change, setChange] = useState<HpChange | null>(null);

  if (hp !== prev) {
    setPrev(hp);
    setChange({ delta: hp - prev, id: (change?.id ?? 0) + 1, impact });
  }

  return change;
}

const SHAKE = [{ transform: "none" }, { transform: "translateX(-6px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "none" }];

/** Тремтіння без перемонтування піддерева: Web Animations перезапускається на кожну втрату HP. */
export function useDamageShake<T extends HTMLElement>(change: HpChange | null) {
  const ref = useRef<T>(null);

  const id = change && change.delta < 0 ? change.id : null;

  const delayMs = change?.impact?.delayMs ?? 0;

  useEffect(() => {
    if (id === null) return;

    const timer = setTimeout(() => ref.current?.animate?.(SHAKE, { duration: 350 }), delayMs);

    return () => clearTimeout(timer);
  }, [id, delayMs]);

  return ref;
}
