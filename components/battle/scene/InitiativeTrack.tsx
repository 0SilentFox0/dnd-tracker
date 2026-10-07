"use client";

import { memo } from "react";

import { Portrait } from "@/components/battle/hud";
import { useBattleSceneData } from "@/lib/hooks/battle";
import { ROMAN } from "@/lib/utils/battle/view";

const roman = (n: number) => (n <= 5 ? ROMAN[n] : n <= 10 ? `${["V", "VI", "VII", "VIII", "IX", "X"][n - 5]}` : String(n));

export const InitiativeTrack = memo(function InitiativeTrack() {
  const { queue, myParticipants, select } = useBattleSceneData();

  const mine = new Set(myParticipants.map((p) => p.basicInfo.id));

  return (
    <div className="flex h-[72px] items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
      {queue.map((e, i) =>
        e.kind === "round" ? (
          <span key={`r${e.round}`} className="relative mx-0.5 h-12 w-px shrink-0 bg-white/30">
            <span className="hud-sc absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full text-[11px] text-[var(--hud-muted)]">{roman(e.round)}</span>
          </span>
        ) : (
          <button key={`${e.participant.basicInfo.id}-${i}`} type="button" onClick={() => select(e.participant.basicInfo.id)} className="shrink-0">
            <Portrait participant={e.participant} size={e.current ? 52 : 36} current={e.current} me={!e.current && mine.has(e.participant.basicInfo.id)} extra={e.kind === "extra"} />
          </button>
        ),
      )}
    </div>
  );
});
