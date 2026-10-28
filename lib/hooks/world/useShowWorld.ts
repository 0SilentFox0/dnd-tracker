"use client";

import { useMemo } from "react";

import { useWorldMap } from "./useWorldMap";
import { useWorldView } from "./useWorldView";

import { viewToMapProps, type WorldViewMapProps } from "@/lib/utils/world/view-props";
import type { ShowWorld } from "@/types/show";
import type { MapPoint } from "@/types/world";

export function useShowWorld(campaignId: string, world: ShowWorld, isDM: boolean) {
  const player = useWorldView(campaignId, { mapId: isDM ? null : world.mapId, keepPrevious: true });

  const dm = useWorldMap(campaignId, isDM ? world.mapId : null, { keepPrevious: true });

  const query = isDM ? dm : player;

  const props = useMemo<WorldViewMapProps | undefined>(() => {
    if (isDM) return dm.data ? { detail: dm.data, heroes: dm.data.heroes ?? [] } : undefined;

    return player.data ? viewToMapProps(player.data) : undefined;
  }, [isDM, dm.data, player.data]);

  const target = world.focusMarkerId ? props?.detail.markers.find((m) => m.id === world.focusMarkerId) : undefined;

  const { x, y } = target ?? { x: 0, y: 0 };

  const targetId = target?.id;

  // keyed by value so a refetch does not re-centre a map the viewer panned
  const focus = useMemo<{ point: MapPoint; seq: number } | undefined>(() => (targetId ? { point: { x, y }, seq: 1 } : undefined), [targetId, x, y]);

  const status: "loading" | "missing" | "ready" = props ? "ready" : query.isError ? "missing" : "loading";

  return { status, props, focus, selectedId: target?.id, mapId: world.mapId };
}
