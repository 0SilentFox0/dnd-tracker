import type { WorldHero } from "@/types/world";

export const HERO_CLUSTER_PX = 24;

export interface HeroClusterGroup {
  key: string;
  x: number;
  y: number;
  heroes: WorldHero[];
}

export function clusterHeroes(heroes: WorldHero[], px: (h: WorldHero) => { x: number; y: number }, thresholdPx: number): HeroClusterGroup[] {
  const ordered = [...heroes.filter((h) => h.own), ...heroes.filter((h) => !h.own)];

  const groups: (HeroClusterGroup & { anchor: { x: number; y: number } })[] = [];

  for (const h of ordered) {
    const p = px(h);

    const home = groups.find((g) => Math.hypot(g.anchor.x - p.x, g.anchor.y - p.y) < thresholdPx);

    if (home) home.heroes.push(h);
    else groups.push({ key: h.id, x: h.x, y: h.y, heroes: [h], anchor: p });
  }

  return groups.map(({ anchor: _anchor, ...g }) => g);
}
