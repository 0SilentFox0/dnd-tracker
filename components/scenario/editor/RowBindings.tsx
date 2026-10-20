"use client";

import { useState } from "react";
import { Image as ImageIcon, Swords, X } from "lucide-react";

import { BattlePickerDialog } from "./BattlePickerDialog";
import { SlidePickerDialog } from "./SlidePickerDialog";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useBattleBriefs } from "@/lib/hooks/battles";
import { useDeck } from "@/lib/hooks/show";
import type { ScenarioRow, ScenarioRowSlide } from "@/types/scenario";

type Props = { campaignId: string; pageId: string; row: ScenarioRow; onChange: { slide(v: ScenarioRowSlide | undefined): void; battle(v: string | undefined): void } };

export function RowBindings({ campaignId, pageId, row, onChange }: Props) {
  const [picking, setPicking] = useState<"slide" | "battle" | null>(null);

  const { data: deck } = useDeck(campaignId, row.slide?.deckId ?? null);

  const { data: briefs } = useBattleBriefs(campaignId, { enabled: !!row.battleId });

  const slide = row.slide && deck?.slides.find((s) => s.id === row.slide?.slideId);

  const battle = row.battleId && briefs?.find((b) => b.id === row.battleId);

  return (
    <div className="sb-bindings sans">
      {row.slide ? (
        <span className="sb-chip">
          {slide ? (
            <>
              <OptimizedImage src={slide.imageUrl} alt="" width={48} height={27} className="h-[27px] w-12 rounded object-cover" />
              {slide.title ?? deck?.title}
            </>
          ) : (
            deck && "Слайд недоступний"
          )}
          <button type="button" aria-label="Відв'язати слайд" onClick={() => onChange.slide(undefined)}>
            <X className="size-3" />
          </button>
        </span>
      ) : (
        <button type="button" className="toggle" aria-label="Прив'язати слайд" onClick={() => setPicking("slide")}>
          <ImageIcon className="size-3" /> Слайд
        </button>
      )}
      {row.battleId ? (
        <span className="sb-chip">
          {battle ? `⚔ ${battle.name}` : briefs && "Бій недоступний"}
          <button type="button" aria-label="Відв'язати бій" onClick={() => onChange.battle(undefined)}>
            <X className="size-3" />
          </button>
        </span>
      ) : (
        <button type="button" className="toggle" aria-label="Прив'язати бій" onClick={() => setPicking("battle")}>
          <Swords className="size-3" /> Бій
        </button>
      )}
      <SlidePickerDialog campaignId={campaignId} pageId={pageId} open={picking === "slide"} onOpenChange={(v) => setPicking(v ? "slide" : null)} onPick={onChange.slide} />
      <BattlePickerDialog campaignId={campaignId} open={picking === "battle"} onOpenChange={(v) => setPicking(v ? "battle" : null)} onPick={onChange.battle} />
    </div>
  );
}
