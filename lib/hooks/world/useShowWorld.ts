"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { worldKeys } from "./keys";
import { useWorldMap } from "./useWorldMap";
import { useWorldView } from "./useWorldView";

import { getWorldView } from "@/lib/api/world";
import { mergePartyViews, sanitizeDmDetail } from "@/lib/utils/world/party-view";
import { viewToMapProps, type WorldViewMapProps } from "@/lib/utils/world/view-props";
import type { ShowWorld } from "@/types/show";
import type { MapPoint, WorldView } from "@/types/world";

export function useShowWorld(campaignId: string, world: ShowWorld, isDM: boolean, readOnly = false) {
  const player = useWorldView(campaignId, { mapId: isDM ? null : world.mapId, keepPrevious: true });

  const dm = useWorldMap(campaignId, isDM ? world.mapId : null, { keepPrevious: true });

  const heroIds = useMemo(() => (readOnly ? [...new Set((dm.data?.heroes ?? []).map((h) => h.id))] : []), [readOnly, dm.data?.heroes]);

  const party = useQueries({
    queries: heroIds.map((asHeroId) => ({
      queryKey: worldKeys.view(campaignId, world.mapId, asHeroId),
      queryFn: () => getWorldView(campaignId, { mapId: world.mapId, asHeroId }),
      staleTime: 30_000,
      retry: false,
    })),
    combine: (results) => ({ views: results.flatMap((q) => (q.data ? [q.data as WorldView] : [])), pending: results.some((q) => q.isPending) }),
  });

  const { views: partyViews, pending: partyPending } = party;

  const query = isDM ? dm : player;

  const props = useMemo<WorldViewMapProps | undefined>(() => {
    if (readOnly) {
      if (!dm.data || partyPending) return undefined;

      return partyViews.length > 0 ? mergePartyViews(partyViews) : sanitizeDmDetail(dm.data);
    }

    if (isDM) return dm.data ? { detail: dm.data, heroes: dm.data.heroes ?? [] } : undefined;

    return player.data ? viewToMapProps(player.data) : undefined;
  }, [isDM, readOnly, dm.data, player.data, partyPending, partyViews]);

  const target = world.focusMarkerId ? props?.detail.markers.find((m) => m.id === world.focusMarkerId) : undefined;

  const { x, y } = target ?? { x: 0, y: 0 };

  const targetId = target?.id;

  // keyed by value so a refetch does not re-centre a map the viewer panned
  const focus = useMemo<{ point: MapPoint; seq: number } | undefined>(() => (targetId ? { point: { x, y }, seq: 1 } : undefined), [targetId, x, y]);

  const status: "loading" | "missing" | "ready" = props ? "ready" : query.isError ? "missing" : "loading";

  return { status, props, focus, selectedId: target?.id, mapId: world.mapId };
}
