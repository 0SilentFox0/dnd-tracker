"use client";

import Link from "next/link";
import { MapPin, Play, Swords } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { MarkerChip } from "@/components/scenario/MarkerChip";
import { BATTLE_STATUS_LABEL, BattleStatus } from "@/lib/constants/battle";
import type { ScenarioPlay } from "@/lib/hooks/scenario";
import { battleAction, markerOnScreen, rowBattleState, rowSlideState } from "@/lib/utils/scenario/play";
import type { ScenarioMarkerRef, ScenarioRow } from "@/types/scenario";

export function MarkerPlay({ campaignId, marker, play }: { campaignId: string; marker: ScenarioMarkerRef; play: ScenarioPlay }) {
  const onScreen = markerOnScreen(marker, play.lookup.show);

  return (
    <MarkerChip
      campaignId={campaignId}
      marker={marker}
      action={(available) =>
        onScreen ? (
          <span className="sb-bind-live">● На екрані</span>
        ) : (
          <button type="button" className="toggle" aria-label="Показати на карті" disabled={!available || play.pending} onClick={() => play.showMarker(marker)}>
            <MapPin className="size-3" /> Показати на карті
          </button>
        )
      }
    />
  );
}

export function RowPlayControls({ campaignId, row, play }: { campaignId: string; row: ScenarioRow; play: ScenarioPlay }) {
  const slide = rowSlideState(row, play.lookup);

  const battle = rowBattleState(row, play.lookup);

  const action = battleAction(battle);

  if (slide.kind === "none" && battle.kind === "none" && !row.marker) return null;

  return (
    <div className="sb-play sans">
      {slide.kind === "ready" && (
        <span className="sb-bind" data-on-screen={slide.active || undefined}>
          <OptimizedImage src={slide.slide.imageUrl} alt="" width={64} height={36} className="sb-thumb" />
          <span className="sb-bind-name">{slide.slide.title ?? "Слайд"}</span>
          {slide.active ? (
            <span className="sb-bind-live">● На екрані</span>
          ) : (
            <button type="button" className="toggle" aria-label="Показати слайд" disabled={play.pending} onClick={() => play.showSlide(row)}>
              <Play className="size-3" /> Показати
            </button>
          )}
        </span>
      )}
      {row.marker && <MarkerPlay campaignId={campaignId} marker={row.marker} play={play} />}
      {slide.kind === "loading" && <span className="sb-bind sb-missing">Слайд…</span>}
      {slide.kind === "missing" && <span className="sb-bind sb-missing">Слайд недоступний</span>}
      {battle.kind === "missing" && <span className="sb-bind sb-missing">Бій недоступний</span>}
      {battle.kind === "ready" && (
        <span className="sb-bind" data-battle={battle.battle.status}>
          <Swords className="size-4 shrink-0" />
          <span className="sb-bind-name">
            {battle.battle.name} <small>· {BATTLE_STATUS_LABEL[battle.battle.status as BattleStatus] ?? battle.battle.status}</small>
          </span>
          {action !== "none" && (
            <button type="button" className="toggle" disabled={play.pending} onClick={() => play.runBattle(row)}>
              {action === "start" ? "Почати бій" : battle.called ? "Покликати ще раз" : "Покликати в бій"}
            </button>
          )}
          {battle.battle.status === BattleStatus.ACTIVE && (
            <Link className="toggle" href={`/campaigns/${campaignId}/battles/${battle.battle.id}`} target="_blank" rel="noopener">
              До бою ↗
            </Link>
          )}
          {action === "none" && battle.battle.status === BattleStatus.COMPLETED && (
            <button type="button" className="toggle" disabled>
              Бій завершено
            </button>
          )}
        </span>
      )}
    </div>
  );
}
