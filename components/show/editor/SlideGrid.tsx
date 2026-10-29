"use client";

import type { Dispatch } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, type LucideIcon, Music, Puzzle, Trash2 } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import type { DeckDraftAction } from "@/lib/utils/show/deck-draft";
import type { Slide } from "@/types/show";

function IconButton({ label, icon: Icon, disabled, onClick }: { label: string; icon: LucideIcon; disabled?: boolean; onClick(): void }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex size-7 items-center justify-center rounded text-hud-muted hover:bg-white/10 hover:text-hud-bone disabled:opacity-30">
      <Icon className="size-4" />
    </button>
  );
}

export function SlideGrid({ slides, actions }: { slides: Slide[]; actions: { dispatch: Dispatch<DeckDraftAction>; edit(id: string): void } }) {
  const t = useTranslations("show");

  const { dispatch, edit } = actions;

  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {slides.map((slide, i) => (
        <li key={slide.id} className="overflow-hidden rounded border border-hud-rule bg-black/40">
          <button type="button" aria-label={t("slide", { index: i + 1 })} onClick={() => edit(slide.id)} className="relative block aspect-video w-full bg-black">
            <OptimizedImage src={slide.imageUrl} alt="" width={320} height={180} className="size-full object-contain" />
            <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs text-hud-bone">{i + 1}</span>
            {slide.kind === "puzzle" && (
              <span aria-label={t("grid.puzzle")} className="absolute bottom-1 left-1 rounded bg-black/70 p-0.5 text-hud-gold">
                <Puzzle className="size-3.5" />
              </span>
            )}
            {slide.trackId && (
              <span aria-label={t("grid.hasTrack")} className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-hud-gold">
                <Music className="size-3.5" />
              </span>
            )}
          </button>
          <div className="flex items-center gap-1 px-1.5 py-1">
            <span className="min-w-0 flex-1 truncate text-xs text-hud-bone" title={slide.title}>
              {slide.title ?? ""}
            </span>
            <IconButton label={t("grid.moveLeft")} icon={ChevronLeft} disabled={i === 0} onClick={() => dispatch({ type: "move", id: slide.id, dir: -1 })} />
            <IconButton label={t("grid.moveRight")} icon={ChevronRight} disabled={i === slides.length - 1} onClick={() => dispatch({ type: "move", id: slide.id, dir: 1 })} />
            <IconButton label={t("grid.remove")} icon={Trash2} onClick={() => dispatch({ type: "remove", id: slide.id })} />
          </div>
        </li>
      ))}
    </ol>
  );
}
