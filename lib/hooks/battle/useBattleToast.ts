"use client";

import { useCallback, useRef, useState } from "react";

export interface BattleToastApi {
  message: string | null;
  show(message: string): void;
  dismiss(): void;
}

const TOAST_MS = 3_500;

export function useBattleToast(): BattleToastApi {
  const [message, setMessage] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);

    setMessage(null);
  }, []);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);

    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  return { message, show, dismiss };
}
