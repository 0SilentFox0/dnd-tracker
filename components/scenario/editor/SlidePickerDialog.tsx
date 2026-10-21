"use client";

import { useState } from "react";
import { Images } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useDeck, useDecks } from "@/lib/hooks/show";
import type { ScenarioRowSlide } from "@/types/scenario";

type Props = { campaignId: string; pageId: string; open: boolean; onOpenChange(open: boolean): void; onPick(v: ScenarioRowSlide): void };

export function SlidePickerDialog({ campaignId, pageId, open, onOpenChange, onPick }: Props) {
  const { data: decks = [], isLoading } = useDecks(campaignId, { enabled: open });

  const own = decks.filter((d) => d.scenarioPageId === pageId);

  const others = decks.filter((d) => d.scenarioPageId !== pageId);

  const [chosen, setChosen] = useState<string | null>(null);

  const openDeckId = chosen ?? own[0]?.id ?? null;

  const { data: deck, isLoading: deckLoading } = useDeck(campaignId, openDeckId);

  const deckButton = (d: { id: string; title: string }) => (
    <Button key={d.id} type="button" size="sm" variant={d.id === openDeckId ? "default" : "outline"} onClick={() => setChosen(d.id)}>
      {d.title}
    </Button>
  );

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title="Слайд для абзацу">
      {isLoading ? (
        <LoadingState />
      ) : decks.length === 0 ? (
        <EmptyState icon={Images} title="Немає наборів слайдів" />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">{own.map(deckButton)}</div>
          {others.length > 0 && (
            <>
              <p className="text-sm text-hud-muted">Інші набори</p>
              <div className="flex flex-wrap gap-2">{others.map(deckButton)}</div>
            </>
          )}
          {deckLoading && <LoadingState rows={2} />}
          {deck && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {deck.slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={slide.title ?? `Слайд ${i + 1}`}
                  className="overflow-hidden rounded border border-hud-rule"
                  onClick={() => {
                    onPick({ deckId: deck.id, slideId: slide.id });
                    onOpenChange(false);
                  }}
                >
                  <OptimizedImage src={slide.imageUrl} alt="" width={96} height={54} className="aspect-video w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </ResponsiveDialog>
  );
}
