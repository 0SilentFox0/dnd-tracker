"use client";

import { useEffect, useRef } from "react";
import { Music, Star, X } from "lucide-react";

import { SHOW_TONE, ShowButton } from "./show-ui";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { type ShowControl, useDeck, useDecks } from "@/lib/hooks/show";
import { cn } from "@/lib/utils";
import type { ShowState, SlideDeckSummary } from "@/types/show";

const SELECT = "h-8 min-w-0 max-w-64 rounded border bg-transparent px-2 text-sm [&>*]:bg-neutral-900 [&>*]:text-neutral-100";

const inScene = (sceneId?: string) => (d: SlideDeckSummary) => !!sceneId && d.scenarioPageId === sceneId;

function DeckOptions({ decks, sceneId }: { decks: SlideDeckSummary[]; sceneId?: string }) {
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
      <optgroup label="Ця сцена">{options(own)}</optgroup>
      {rest.length > 0 && <optgroup label="Інші набори">{options(rest)}</optgroup>}
    </>
  );
}

/** Набір для перегляду: поточний показу, інакше перший набір сцени. */
export function ShowDeckStrip({ campaignId, show, control, sceneId }: { campaignId: string; show: ShowState | null; control: ShowControl; sceneId?: string }) {
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
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select aria-label="Набір" value={deckId ?? ""} onChange={(e) => e.target.value && void control.send({ action: "open", deckId: e.target.value })} className={cn(SELECT, SHOW_TONE.rule)}>
          {!deckId && <option value="">Оберіть набір</option>}
          {decks && <DeckOptions decks={decks} sceneId={sceneId} />}
        </select>
        <span className={cn("ml-auto flex min-w-0 items-center gap-1.5", SHOW_TONE.muted)}>
          Заглушка:
          {cover ? (
            <>
              <OptimizedImage src={cover.slide.imageUrl} alt="" width={48} height={27} className="h-[27px] w-12 shrink-0 rounded object-cover" />
              <span className="truncate">{cover.slide.title ?? "без назви"}</span>
              <ShowButton aria-label="Прибрати картинку заглушки" className="h-6 px-1" onClick={() => void control.send({ action: "clearCover" })}>
                <X className="size-3" />
              </ShowButton>
            </>
          ) : (
            <span>стандартна — ☆ на слайді робить його заглушкою</span>
          )}
        </span>
      </div>
      {deck && (
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {deck.slides.map((slide, i) => {
            const current = show?.deckId === deck.id && slide.id === currentId;

            const isCover = cover?.deckId === deck.id && cover.slide.id === slide.id;

            return (
              <li key={slide.id} ref={current ? currentRef : undefined} className="relative w-32 shrink-0">
                <button
                  type="button"
                  aria-current={current || undefined}
                  aria-label={`Слайд ${i + 1}${slide.title ? `: ${slide.title}` : ""}`}
                  onClick={() => void control.send({ action: "open", deckId: deck.id, slideId: slide.id })}
                  className={cn("block w-full overflow-hidden rounded border text-left", current ? SHOW_TONE.accent : SHOW_TONE.rule)}
                >
                  <OptimizedImage src={slide.imageUrl} alt="" width={128} height={72} className="h-[72px] w-32 object-cover" />
                  <span className="block truncate px-1.5 py-0.5 text-xs">
                    {i + 1}. {slide.title ?? "Без назви"}
                  </span>
                </button>
                {slide.trackId && <Music aria-label="Слайд з треком" className="absolute right-1.5 top-1.5 size-3.5 text-amber-300 drop-shadow" />}
                <button
                  type="button"
                  aria-pressed={isCover}
                  aria-label={isCover ? "Це заглушка" : "Зробити заглушкою"}
                  title={isCover ? "Це заглушка" : "Зробити заглушкою"}
                  onClick={() => void control.send(isCover ? { action: "clearCover" } : { action: "setCover", deckId: deck.id, slideId: slide.id })}
                  className="absolute left-1 top-1 rounded bg-black/70 p-1 text-amber-300"
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
