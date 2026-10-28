import { HeroCluster } from "@/components/world/HeroCluster";
import { clusterHeroes, HERO_CLUSTER_PX } from "@/lib/utils/world/hero-clusters";
import type { WorldHero } from "@/types/world";

interface WorldHeroesProps {
  heroes: WorldHero[];
  zoom: number;
  box: { width: number; height: number };
  onHeroClick?(id: string): void;
}

export function WorldHeroes({ heroes, zoom, box, onHeroClick }: WorldHeroesProps) {
  const clusters = clusterHeroes(heroes, (h) => ({ x: h.x * box.width * zoom, y: h.y * box.height * zoom }), HERO_CLUSTER_PX);

  return (
    <>
      {clusters.map((c) => (
        <HeroCluster key={c.key} cluster={c} zoom={zoom} onHeroClick={onHeroClick} />
      ))}
    </>
  );
}
