import { viewToMapProps, type WorldViewMapProps } from "./view-props";

import type { WorldMapDetail, WorldView } from "@/types/world";

/** Projector view of a DM map payload when no hero view is available: no DM text, no fog-hidden markers, no heroes. */
export function sanitizeDmDetail(detail: WorldMapDetail): WorldViewMapProps {
  const markers = detail.markers.filter((m) => !detail.map.fogEnabled || m.alwaysVisible).map((m) => ({ ...m, dmNote: null }));

  return { detail: { map: detail.map, markers }, heroes: [], fog: detail.map.fogEnabled ? { shapes: [], radius: detail.map.revealRadius } : undefined };
}

/** Union of per-hero player views = what the whole party has seen. */
export function mergePartyViews(views: WorldView[]): WorldViewMapProps {
  const [first] = views;

  const markers = new Map(views.flatMap((v) => v.markers).map((m) => [m.id, { ...m, dmNote: null }]));

  const heroes = new Map(views.flatMap((v) => v.heroes).map((h) => [h.id, { ...h, own: false }]));

  return viewToMapProps({ ...first, markers: [...markers.values()], heroes: [...heroes.values()], reveals: views.flatMap((v) => v.reveals), notes: [] });
}
