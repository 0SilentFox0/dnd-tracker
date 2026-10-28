"use client";

import Link from "next/link";
import { Play, Swords } from "lucide-react";

import { BattleStatus } from "@/lib/constants/battle";
import type { ScenarioPlay } from "@/lib/hooks/scenario";
import { battleAction, rowBattleState, rowSlideState } from "@/lib/utils/scenario/play";
import type { ScenarioRow } from "@/types/scenario";

export function RowPlayControls({ campaignId, row, play }: { campaignId: string; row: ScenarioRow; play: ScenarioPlay }) {
  const slide = rowSlideState(row, play.lookup);

  const battle = rowBattleState(row, play.lookup);

  const action = battleAction(battle);

  if (slide.kind === "none" && battle.kind === "none") return null;

  return (
    <div className="sb-play sans">
      {slide.kind === "ready" && (
        <button type="button" className="toggle" aria-pressed={slide.active} disabled={play.pending} onClick={() => play.showSlide(row)}>
          <Play className="size-3" /> Показати слайд
        </button>
      )}
      {slide.kind === "missing" && <span className="sb-missing">Слайд недоступний</span>}
      {battle.kind === "missing" && <span className="sb-missing">Бій недоступний</span>}
      {battle.kind === "ready" && action !== "none" && (
        <button type="button" className="toggle" disabled={play.pending} onClick={() => play.runBattle(row)}>
          <Swords className="size-3" /> {action === "start" ? `Почати бій «${battle.battle.name}»` : battle.called ? "Покликати ще раз" : "Покликати в бій"}
        </button>
      )}
      {battle.kind === "ready" && battle.battle.status === BattleStatus.ACTIVE && (
        <Link className="toggle" href={`/campaigns/${campaignId}/battles/${battle.battle.id}`} target="_blank" rel="noopener">
          Перейти до бою ↗
        </Link>
      )}
      {battle.kind === "ready" && action === "none" && battle.battle.status === BattleStatus.COMPLETED && (
        <button type="button" className="toggle" disabled>
          Бій завершено
        </button>
      )}
    </div>
  );
}
