"use client";

import { useState } from "react";

import { useWorldView } from "./useWorldView";
export function useHeroEyes(campaignId: string, mapId: string | null) {
  const [asHeroId, setAsHeroId] = useState<string | null>(null);

  const view = useWorldView(campaignId, { mapId: asHeroId ? mapId : null, asHeroId: asHeroId ?? undefined });

  return { asHeroId, setAsHeroId, view };
}
