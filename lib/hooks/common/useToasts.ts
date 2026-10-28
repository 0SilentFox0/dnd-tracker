"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

export interface Toast {
  id: string;
  icon?: ReactNode;
  text: ReactNode;
  href?: string;
}

const TOAST_MS = 6_000;

const MAX_TOASTS = 3;

export function useToasts({ durationMs = TOAST_MS }: { durationMs?: number } = {}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);

    if (timer) clearTimeout(timer);

    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Toast) => {
      if (timers.current.has(toast.id)) return;

      timers.current.set(toast.id, setTimeout(() => dismiss(toast.id), durationMs));
      setToasts((list) => {
        const next = [...list, toast];

        for (const evicted of next.slice(0, Math.max(0, next.length - MAX_TOASTS))) {
          clearTimeout(timers.current.get(evicted.id));
          timers.current.delete(evicted.id);
        }

        return next.slice(-MAX_TOASTS);
      });
    },
    [dismiss, durationMs],
  );

  useEffect(() => {
    const active = timers.current;

    return () => active.forEach(clearTimeout);
  }, []);

  return { toasts, push, dismiss };
}
