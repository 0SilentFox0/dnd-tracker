"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Image as ImageIcon, MapPin, Swords, X } from "lucide-react";

import { BattlePickerDialog } from "./BattlePickerDialog";
import { MarkerPickerDialog } from "./MarkerPickerDialog";
import { SlidePickerDialog } from "./SlidePickerDialog";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { MarkerChip } from "@/components/scenario/MarkerChip";
import { useBattleBriefs } from "@/lib/hooks/battles";
import { useDeck } from "@/lib/hooks/show";
import type { ScenarioMarkerRef, ScenarioRow, ScenarioRowSlide } from "@/types/scenario";

type Props = { campaignId: string; pageId: string; row: ScenarioRow; onChange: { slide(v: ScenarioRowSlide | undefined): void; battle(v: string | undefined): void; marker(v: ScenarioMarkerRef | undefined): void } };

export function RowBindings({ campaignId, pageId, row, onChange }: Props) {
  const t = useTranslations("scenario.bindings");

  const [picking, setPicking] = useState<"slide" | "battle" | "marker" | null>(null);

  const { data: deck } = useDeck(campaignId, row.slide?.deckId ?? null);

  const { data: briefs } = useBattleBriefs(campaignId, { enabled: !!row.battleId });

  const slide = row.slide && deck?.slides.find((s) => s.id === row.slide?.slideId);

  const battle = row.battleId && briefs?.find((b) => b.id === row.battleId);

  return (
    <div className="sb-bindings">
      {row.slide ? (
        <span className="sb-chip">
          {slide ? (
            <>
              <OptimizedImage src={slide.imageUrl} alt="" width={36} height={20} className="h-5 w-9 shrink-0 rounded-sm object-cover" />
              <span className="sb-chip-name">{slide.title ?? deck?.title}</span>
            </>
          ) : (
            deck && t("slideMissing")
          )}
          <button type="button" aria-label={t("unbindSlide")} onClick={() => onChange.slide(undefined)}>
            <X className="size-3" />
          </button>
        </span>
      ) : (
        <button type="button" className="toggle" aria-label={t("bindSlide")} onClick={() => setPicking("slide")}>
          <ImageIcon className="size-3.5" /> {t("slide")}
        </button>
      )}
      {row.battleId ? (
        <span className="sb-chip">
          {battle ? (
            <>
              <Swords className="size-3.5 shrink-0" />
              <span className="sb-chip-name">{battle.name}</span>
            </>
          ) : (
            briefs && t("battleMissing")
          )}
          <button type="button" aria-label={t("unbindBattle")} onClick={() => onChange.battle(undefined)}>
            <X className="size-3" />
          </button>
        </span>
      ) : (
        <button type="button" className="toggle" aria-label={t("bindBattle")} onClick={() => setPicking("battle")}>
          <Swords className="size-3.5" /> {t("battle")}
        </button>
      )}
      {row.marker ? (
        <MarkerChip campaignId={campaignId} marker={row.marker} onRemove={() => onChange.marker(undefined)} />
      ) : (
        <button type="button" className="toggle" aria-label={t("bindMarker")} onClick={() => setPicking("marker")}>
          <MapPin className="size-3.5" /> {t("marker")}
        </button>
      )}
      <SlidePickerDialog campaignId={campaignId} pageId={pageId} open={picking === "slide"} onOpenChange={(v) => setPicking(v ? "slide" : null)} onPick={onChange.slide} />
      <BattlePickerDialog campaignId={campaignId} open={picking === "battle"} onOpenChange={(v) => setPicking(v ? "battle" : null)} onPick={onChange.battle} />
      {picking === "marker" && <MarkerPickerDialog campaignId={campaignId} open onOpenChange={(v) => setPicking(v ? "marker" : null)} onPick={onChange.marker} />}
    </div>
  );
}
