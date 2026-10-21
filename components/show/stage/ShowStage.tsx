"use client";

import Image from "next/image";

import { ShowWaiting } from "./ShowWaiting";
import { SlideCaption } from "./SlideCaption";

import { SLIDE_CROSSFADE_MS } from "@/lib/constants/show";
import { useSlideLayers } from "@/lib/hooks/show";
import { cn } from "@/lib/utils";
import { isSupabaseStorageUrl } from "@/lib/utils/common/image-url";
import type { ShowState } from "@/types/show";

const imageProps = (src: string) => ({ src, fill: true, sizes: "100vw", unoptimized: !isSupabaseStorageUrl(src) });

/** Заглушка — замість слайда, коли ДМ її ввімкнув або показ не йде. */
const visibleSlide = (show: ShowState | null) => (show?.slide && !show.curtain ? show.slide : (show?.cover?.slide ?? null));

export function ShowStage({ show }: { show: ShowState | null }) {
  const current = visibleSlide(show);

  const layers = useSlideLayers(current);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {layers.map(({ slide, key, role }) => (
        <div
          key={key}
          className={cn("absolute inset-0", role === "top" && "animate-slide-in", role === "ending" && "animate-slide-out")}
          style={{ animationDuration: `${SLIDE_CROSSFADE_MS}ms` }}
        >
          <Image {...imageProps(slide.imageUrl)} alt={slide.title ?? ""} className="object-contain" priority />
        </div>
      ))}
      {current ? <SlideCaption key={current.id} slide={current} /> : !show?.battle && <ShowWaiting paused={!!show?.curtain} />}
      {show?.nextImageUrl && (
        <div data-slide-preload aria-hidden className="pointer-events-none absolute inset-0 opacity-0">
          <Image {...imageProps(show.nextImageUrl)} alt="" loading="eager" />
        </div>
      )}
    </div>
  );
}
