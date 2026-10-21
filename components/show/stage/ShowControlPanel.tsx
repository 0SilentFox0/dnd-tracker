"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Music, Square } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/lib/hooks/common";
import { type ShowControl, useDeck, useDecks } from "@/lib/hooks/show";
import type { ShowState } from "@/types/show";

export function ShowControlPanel({ campaignId, show, control }: { campaignId: string; show: ShowState | null; control: ShowControl }) {
  const confirm = useConfirm();

  const { data: decks } = useDecks(campaignId);

  const { data: deck } = useDeck(campaignId, show?.deckId ?? null);

  const currentRef = useRef<HTMLButtonElement>(null);

  const currentId = show?.slide?.id;

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ inline: "center", block: "nearest" });
  }, [currentId, deck]);

  const end = async () => {
    if (await confirm({ title: "Завершити показ?", description: "Гравці побачать очікування, музика зупиниться.", confirmLabel: "Завершити", destructive: true })) void control.send({ action: "end" });
  };

  return (
    <fieldset disabled={control.pending} className="min-w-0 space-y-3 border-t border-hud-rule bg-black/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Набір" value={show?.deckId ?? ""} onChange={(e) => e.target.value && void control.send({ action: "open", deckId: e.target.value })} className="h-9 rounded border border-hud-rule bg-black/70 px-2 text-sm text-hud-bone">
          {!show?.deckId && <option value="">Оберіть набір</option>}
          {decks?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={() => void control.send({ action: "prev" })}>
          <ChevronLeft className="size-4" />
          Попередній слайд
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void control.send({ action: "next" })}>
          Наступний слайд
          <ChevronRight className="size-4" />
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={!show?.deckId && !show?.battle} onClick={() => void end()}>
          <Square className="size-4" />
          Завершити показ
        </Button>
      </div>
      {deck && show?.deckId && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {deck.slides.map((slide, i) => {
            const current = slide.id === show.slide?.id;

            return (
              <button
                key={slide.id}
                ref={current ? currentRef : undefined}
                type="button"
                aria-current={current || undefined}
                aria-label={`Слайд ${i + 1}`}
                onClick={() => void control.send({ action: "open", deckId: deck.id, slideId: slide.id })}
                className={`relative shrink-0 overflow-hidden rounded border ${current ? "border-hud-gold-strong ring-2 ring-hud-gold-strong" : "border-hud-rule"}`}
              >
                <OptimizedImage src={slide.imageUrl} alt="" width={96} height={54} className="h-[54px] w-24 object-cover" />
                <span className="absolute left-0.5 top-0.5 rounded bg-black/70 px-1 text-[10px] text-hud-bone">{i + 1}</span>
                {slide.trackId && <Music className="absolute bottom-0.5 right-0.5 size-3 text-hud-gold-bright" />}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
