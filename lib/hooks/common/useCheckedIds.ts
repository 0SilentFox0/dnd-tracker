"use client";

import { useState } from "react";

export function useCheckedIds(items: readonly { id: string }[]) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(items.map((c) => c.id)));

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);

      if (!next.delete(id)) next.add(id);

      return next;
    });

  return { picked, toggle };
}
