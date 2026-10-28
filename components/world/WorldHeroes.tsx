import Image from "next/image";

import { cn } from "@/lib/utils";
import type { WorldHero } from "@/types/world";

interface WorldHeroesProps {
  heroes: WorldHero[];
  zoom: number;
  onHeroClick?(id: string): void;
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase();

export function WorldHeroes({ heroes, zoom, onHeroClick }: WorldHeroesProps) {
  return (
    <>
      {heroes.map((h) => (
        <button
          key={h.id}
          type="button"
          aria-label={h.name}
          data-own={h.own}
          className={cn("atlas-hero absolute", h.own && "atlas-hero-own")}
          style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})`, touchAction: "none" }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => {
            e.stopPropagation();
            onHeroClick?.(h.id);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {h.avatar ? <Image src={h.avatar} alt="" width={30} height={30} draggable={false} className="size-full rounded-full object-cover" /> : <span aria-hidden>{initial(h.name)}</span>}
        </button>
      ))}
    </>
  );
}
