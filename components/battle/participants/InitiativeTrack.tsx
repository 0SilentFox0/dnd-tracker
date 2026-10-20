"use client";

import { memo, useRef } from "react";

import { Portrait } from "@/components/battle/hud";
import { ROMAN_NUMERALS } from "@/lib/constants/spells";
import { useBattleSceneData } from "@/lib/hooks/battle";
import { useFlip } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { queueKeys } from "@/lib/utils/battle/view";

const roman = (n: number) => ROMAN_NUMERALS[n] ?? String(n);

export const InitiativeTrack = memo(function InitiativeTrack() {
  const { turn: { queue }, roster: { myParticipants }, select } = useBattleSceneData();

  const mine = new Set(myParticipants.map((p) => p.basicInfo.id));

  const keys = queueKeys(queue);

  const track = useRef<HTMLDivElement>(null);

  useFlip(track, queue);

  return (
    <div ref={track} className="relative flex h-[72px] items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
      {queue.map((e, i) =>
        e.kind === "round" ? (
          <span key="round" data-flip="round" className="relative mx-0.5 h-12 w-px shrink-0 bg-white/30">
            <span className="hud-sc absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full text-[11px] text-[var(--hud-muted)]">{roman(e.round)}</span>
          </span>
        ) : (
          <button key={keys[i]} data-flip={keys[i]} type="button" onClick={() => select(e.participant.basicInfo.id)} className="shrink-0">
            <Portrait fx="track" key={e.current ? "current" : "queued"} className={cn(e.current && "animate-[hud-turn_.6s_ease-out]")} participant={e.participant} size={e.current ? 52 : 36} current={e.current} me={!e.current && mine.has(e.participant.basicInfo.id)} extra={e.kind === "extra"} />
          </button>
        ),
      )}
    </div>
  );
});
