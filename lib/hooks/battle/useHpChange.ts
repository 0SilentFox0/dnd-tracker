"use client";

import { useEffect, useRef, useState } from "react";

export function useHpChange(hp: number): { delta: number; id: number } | null {
  const [prev, setPrev] = useState(hp);

  const [change, setChange] = useState<{ delta: number; id: number } | null>(null);

  if (hp !== prev) {
    setPrev(hp);
    setChange({ delta: hp - prev, id: (change?.id ?? 0) + 1 });
  }

  return change;
}

const SHAKE = [{ transform: "none" }, { transform: "translateX(-6px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "none" }];

/** Тремтіння без перемонтування піддерева: Web Animations перезапускається на кожну втрату HP. */
export function useDamageShake<T extends HTMLElement>(change: { delta: number; id: number } | null, delayMs = 0) {
  const ref = useRef<T>(null);

  const id = change && change.delta < 0 ? change.id : null;

  useEffect(() => {
    if (id === null) return;

    const timer = setTimeout(() => ref.current?.animate?.(SHAKE, { duration: 350 }), delayMs);

    return () => clearTimeout(timer);
  }, [id, delayMs]);

  return ref;
}
