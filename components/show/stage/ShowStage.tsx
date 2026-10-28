"use client";

import Image from "next/image";

import { ShowWaiting } from "./ShowWaiting";
import { SlideCaption } from "./SlideCaption";

import { ShowWorldStage } from "@/components/world/show/ShowWorldStage";
import { SLIDE_CROSSFADE_MS } from "@/lib/constants/show";
import { useSlideLayers } from "@/lib/hooks/show";
import { cn } from "@/lib/utils";
import { isSupabaseStorageUrl } from "@/lib/utils/common/image-url";
import { stageMode, visibleSlide } from "@/lib/utils/show/player-view";
import type { ShowState } from "@/types/show";

const imageProps = (src: string) => ({ src, fill: true, sizes: "100vw", unoptimized: !isSupabaseStorageUrl(src) });

export function ShowStage({ show, campaignId, isDM = false }: { show: ShowState | null; campaignId: string; isDM?: boolean }) {
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
      {show?.world && stageMode(show) === "world" && <ShowWorldStage campaignId={campaignId} world={show.world} isDM={isDM} />}
      <div data-slide-preload aria-hidden className="pointer-events-none absolute inset-0 opacity-0">
        {show?.nextImageUrl && <Image {...imageProps(show.nextImageUrl)} alt="" loading="eager" />}
        {show?.cover && current?.id !== show.cover.slide.id && <Image {...imageProps(show.cover.slide.imageUrl)} alt="" loading="eager" />}
      </div>
    </div>
  );
}
