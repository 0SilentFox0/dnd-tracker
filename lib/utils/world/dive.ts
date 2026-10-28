import type { MapPoint, WorldView } from "@/types/world";

export function diveOrigin(prev: Pick<WorldView, "map" | "markers"> | null, next: Pick<WorldView, "map">): MapPoint | null {
  const { parentMarkerId, parentMapId } = next.map;

  if (!prev || !parentMarkerId || parentMapId !== prev.map.id) return null;

  const marker = prev.markers.find((m) => m.id === parentMarkerId);

  return marker ? { x: marker.x, y: marker.y } : null;
}
