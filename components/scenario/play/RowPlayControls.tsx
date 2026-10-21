"use client";

import Link from "next/link";
import { Play, Swords } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { BattleStatus } from "@/lib/constants/battle";
import type { ScenarioPlay } from "@/lib/hooks/scenario";
import { battleAction, rowBattleState, rowSlideState } from "@/lib/utils/scenario/play";
import type { ScenarioRow } from "@/types/scenario";

const BATTLE_STATUS: Record<string, string> = { [BattleStatus.PREPARED]: "підготовлено", [BattleStatus.ACTIVE]: "іде", [BattleStatus.COMPLETED]: "завершено" };

export function RowPlayControls({ campaignId, row, play }: { campaignId: string; row: ScenarioRow; play: ScenarioPlay }) {
  const slide = rowSlideState(row, play.lookup);

  const battle = rowBattleState(row, play.lookup);

  const action = battleAction(battle);

  if (slide.kind === "none" && battle.kind === "none") return null;

  const onScreen = slide.kind === "ready" && slide.active && !play.lookup.show?.curtain;

  return (
    <div className="sb-play sans">
      {slide.kind === "ready" && (
        <span className="sb-bind" data-on-screen={onScreen || undefined}>
          <OptimizedImage src={slide.slide.imageUrl} alt="" width={64} height={36} className="sb-bind-thumb" />
          <span className="sb-bind-name">{slide.slide.title ?? "Слайд"}</span>
          {onScreen ? (
            <span className="sb-bind-live">● На екрані</span>
          ) : (
            <button type="button" className="toggle" aria-label="Показати слайд" disabled={play.pending} onClick={() => play.showSlide(row)}>
              <Play className="size-3" /> Показати
            </button>
          )}
        </span>
      )}
      {slide.kind === "loading" && <span className="sb-bind sb-missing">Слайд…</span>}
      {slide.kind === "missing" && <span className="sb-bind sb-missing">Слайд недоступний</span>}
      {battle.kind === "missing" && <span className="sb-bind sb-missing">Бій недоступний</span>}
      {battle.kind === "ready" && (
        <span className="sb-bind" data-battle={battle.battle.status}>
          <Swords className="size-4 shrink-0" />
          <span className="sb-bind-name">
            {battle.battle.name} <small>· {BATTLE_STATUS[battle.battle.status] ?? battle.battle.status}</small>
          </span>
          {action !== "none" && (
            <button type="button" className="toggle" disabled={play.pending} onClick={() => play.runBattle(row)}>
              {action === "start" ? `Почати бій «${battle.battle.name}»` : battle.called ? "Покликати ще раз" : "Покликати в бій"}
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
