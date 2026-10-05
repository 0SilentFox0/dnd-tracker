"use client";

import { useState } from "react";

export function useHpChange(hp: number): { delta: number; id: number } | null {
  const [prev, setPrev] = useState(hp);

  const [change, setChange] = useState<{ delta: number; id: number } | null>(null);

  if (hp !== prev) {
    setPrev(hp);
    setChange({ delta: hp - prev, id: (change?.id ?? 0) + 1 });
  }

  return change;
}
