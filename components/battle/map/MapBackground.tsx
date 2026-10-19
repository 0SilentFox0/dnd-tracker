"use client";

import { memo, useState } from "react";
import Image from "next/image";

import { DEFAULT_MAP_BACKGROUND } from "@/lib/constants/battle";
import { backgroundBox } from "@/lib/utils/battle/grid";
import type { BattleMapConfig } from "@/types/battle";

/** Фон цілком (без обрізання): клітинка фону = клітинка сітки, зсув — частки клітинки; непокрите лишається темним. */
export const MapBackground = memo(function MapBackground({ map, cellPx, phone }: { map: BattleMapConfig; cellPx: number; phone: boolean }) {
  const src = map.background ?? DEFAULT_MAP_BACKGROUND;

  const [loaded, setLoaded] = useState<{ src: string; aspect: number } | null>(null);

  const box = backgroundBox(map, cellPx, loaded?.src === src ? loaded.aspect : null);

  const px = Math.ceil(box.width);

  return (
    <div data-map-background className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute" style={box}>
        <Image
          src={src}
          alt=""
          fill
          sizes={phone && px > 0 ? `${px}px` : "100vw"}
          className="object-contain object-left-top"
          priority
          onLoad={(e) => {
            const img = e.currentTarget;

            if (img.naturalWidth > 0) setLoaded({ src, aspect: img.naturalHeight / img.naturalWidth });
          }}
        />
      </div>
    </div>
  );
});
