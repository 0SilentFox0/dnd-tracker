"use client";

import { useState } from "react";

import { shortId } from "@/lib/utils/common/short-id";

const resize = (keys: string[], count: number) => (keys.length >= count ? keys.slice(0, count) : [...keys, ...Array.from({ length: count - keys.length }, () => shortId())]);

/** Stable React/error keys for a removable list whose rows have no persisted id; call `removeAt` in the same handler that updates the list. */
export function useRowKeys(count: number) {
  const [stored, setStored] = useState(() => resize([], count));

  const keys = stored.length === count ? stored : resize(stored, count);

  if (keys !== stored) setStored(keys);

  return { keys, removeAt: (index: number) => setStored((prev) => prev.filter((_, i) => i !== index)) };
}
