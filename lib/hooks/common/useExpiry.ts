"use client";

import { useEffect, useState } from "react";

const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** True once `iso` has passed; one timer instead of a ticking interval. */
export function useExpiry(iso: string | null | undefined): boolean {
  const [now, setNow] = useState(() => Date.now());

  const at = iso ? Date.parse(iso) : NaN;

  const expired = Number.isFinite(at) && at <= now;

  useEffect(() => {
    if (!Number.isFinite(at) || expired) return;

    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(at - Date.now(), 0), MAX_TIMEOUT_MS));

    return () => clearTimeout(timer);
  }, [at, expired]);

  return expired;
}
