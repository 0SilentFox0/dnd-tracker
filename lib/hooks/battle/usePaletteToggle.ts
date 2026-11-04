"use client";

import { useCallback, useState } from "react";

export function usePaletteToggle() {
  const [active, setActive] = useState(false);

  const close = useCallback(() => setActive(false), []);

  const toggle = useCallback(() => setActive((o) => !o), []);

  return { active, toggle, close };
}
