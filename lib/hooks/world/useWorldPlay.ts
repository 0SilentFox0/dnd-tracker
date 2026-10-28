"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useWorldView } from "./useWorldView";

import type { MapPoint, WorldHero } from "@/types/world";

export function useWorldPlay(campaignId: string, mapId: string | null) {
  const router = useRouter();

  const pathname = usePathname();

  const view = useWorldView(campaignId, { mapId });

  const [selectedId, select] = useState<string | null>(null);

  const [focus, setFocus] = useState<{ point: MapPoint; seq: number } | undefined>();

  const openMap = useCallback(
    (id: string) => {
      select(null);
      router.push(`${pathname}?map=${id}`);
    },
    [router, pathname],
  );

  const focusHero = useCallback((hero: WorldHero) => setFocus((f) => ({ point: { x: hero.x, y: hero.y }, seq: (f?.seq ?? 0) + 1 })), []);

  return {
    view,
    selectedMarker: view.data?.markers.find((m) => m.id === selectedId) ?? null,
    select,
    focus,
    focusHero,
    openMap,
    myHeroes: view.data?.heroes.filter((h) => h.own) ?? [],
  };
}
