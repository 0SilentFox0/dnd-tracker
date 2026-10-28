import type { RevealShape, WorldHero, WorldMapDetail, WorldView } from "@/types/world";

export interface WorldViewMapProps {
  detail: WorldMapDetail;
  heroes: WorldHero[];
  fog?: { shapes: RevealShape[]; radius: number };
}

export function viewToMapProps(view: WorldView): WorldViewMapProps {
  return {
    detail: { map: view.map, markers: view.markers },
    heroes: view.heroes,
    fog: view.fog ? { shapes: view.reveals, radius: view.map.revealRadius } : undefined,
  };
}
