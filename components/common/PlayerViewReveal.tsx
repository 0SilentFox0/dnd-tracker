"use client";

import { useEffect } from "react";

import { useHydrated } from "@/lib/hooks/common";
import { PLAYER_VIEW_PENDING_ATTR } from "@/lib/utils/common/player-view";

export function PlayerViewReveal() {
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated) document.documentElement.removeAttribute(PLAYER_VIEW_PENDING_ATTR);
  }, [hydrated]);

  return null;
}
