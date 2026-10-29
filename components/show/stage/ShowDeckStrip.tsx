"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Music, Star, X } from "lucide-react";

import { SHOW_TONE, ShowButton } from "./show-ui";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { type ShowControl, useDeck, useDecks } from "@/lib/hooks/show";
import { cn } from "@/lib/utils";
import type { ShowState, SlideDeckSummary } from "@/types/show";

const SELECT = "h-7 min-w-0 max-w-56 rounded bg-transparent pr-1 text-xs opacity-75 hover:opacity-100 [&>*]:bg-neutral-900 [&>*]:text-neutral-100";

const inScene = (sceneId?: string) => (d: SlideDeckSummary) => !!sceneId && d.scenarioPageId === sceneId;

function DeckOptions({ decks, sceneId }: { decks: SlideDeckSummary[]; sceneId?: string }) {
  const t = useTranslations("show");

  const own = decks.filter(inScene(sceneId));

  const rest = decks.filter((d) => !inScene(sceneId)(d));

  const options = (list: SlideDeckSummary[]) =>
    list.map((d) => (
      <option key={d.id} value={d.id}>
        {d.title} ({d.slideCount})
      </option>
    ));

  if (own.length === 0) return <>{options(rest)}</>;

  return (
    <>
      <optgroup label={t("deckStrip.thisScene")}>{options(own)}</optgroup>
      {rest.length > 0 && <optgroup label={t("deckStrip.otherDecks")}>{options(rest)}</optgroup>}
    </>
  );
}

/** Набір для перегляду: поточний показу, інакше перший набір сцени. */
export function ShowDeckStrip({ campaignId, show, control, sceneId }: { campaignId: string; show: ShowState | null; control: ShowControl; sceneId?: string }) {
  const t = useTranslations("show");

  const { data: decks } = useDecks(campaignId);

  const deckId = show?.deckId ?? decks?.find(inScene(sceneId))?.id ?? null;

  const { data: deck } = useDeck(campaignId, deckId);

  const currentRef = useRef<HTMLLIElement>(null);

  const currentId = show?.slide?.id;

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ inline: "center", block: "nearest" });
  }, [currentId, deck]);

  const cover = show?.cover;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center gap-2">
        <select aria-label={t("deckStrip.deck")} value={deckId ?? ""} onChange={(e) => e.target.value && void control.send({ action: "open", deckId: e.target.value })} className={SELECT}>
          {!deckId && <option value="">{t("deckStrip.chooseDeck")}</option>}
          {decks && <DeckOptions decks={decks} sceneId={sceneId} />}
        </select>
        {cover && (
          <span className={cn("ml-auto flex items-center gap-1 text-xs", SHOW_TONE.muted)} title={t("deckStrip.coverTitle", { title: cover.slide.title ?? t("deckStrip.untitledLower") })}>
            <Star className="size-3 fill-current" />
            <OptimizedImage src={cover.slide.imageUrl} alt={t("deckStrip.cover")} width={64} height={36} className="h-[18px] w-8 rounded-sm object-cover" />
            <ShowButton aria-label={t("deckStrip.clearCover")} className="h-6 min-w-6 px-1" onClick={() => void control.send({ action: "clearCover" })}>
              <X className="size-3" />
            </ShowButton>
          </span>
        )}
      </div>
      {deck && (
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {deck.slides.map((slide, i) => {
            const current = show?.deckId === deck.id && slide.id === currentId;

            const isCover = cover?.deckId === deck.id && cover.slide.id === slide.id;

            return (
              <li key={slide.id} ref={current ? currentRef : undefined} className="group relative w-28 shrink-0">
                <button
                  type="button"
                  aria-current={current || undefined}
                  aria-label={slide.title ? t("deckStrip.slideTitled", { index: i + 1, title: slide.title }) : t("slide", { index: i + 1 })}
                  onClick={() => void control.send({ action: "open", deckId: deck.id, slideId: slide.id })}
                  title={slide.title}
                  className={cn("relative block w-full overflow-hidden rounded transition", current ? SHOW_TONE.accent : "opacity-60 hover:opacity-100")}
                >
                  <OptimizedImage src={slide.imageUrl} alt="" width={128} height={72} className="h-[63px] w-28 object-cover" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-0.5 pt-3 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                    {i + 1}. {slide.title ?? t("deckStrip.untitled")}
                  </span>
                </button>
                {slide.trackId && <Music aria-label={t("deckStrip.hasTrack")} className="absolute right-1 top-1 size-3 text-white drop-shadow" />}
                <button
                  type="button"
                  aria-pressed={isCover}
                  aria-label={isCover ? t("deckStrip.isCover") : t("deckStrip.makeCover")}
                  title={isCover ? t("deckStrip.isCover") : t("deckStrip.makeCover")}
                  onClick={() => void control.send(isCover ? { action: "clearCover" } : { action: "setCover", deckId: deck.id, slideId: slide.id })}
                  className={cn("absolute left-0.5 top-0.5 rounded p-0.5 text-amber-300 drop-shadow transition", !isCover && "opacity-0 focus-visible:opacity-100 group-hover:opacity-100")}
                >
                  <Star className={cn("size-3", isCover && "fill-current")} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
