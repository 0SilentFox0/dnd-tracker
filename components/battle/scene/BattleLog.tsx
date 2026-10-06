"use client";

import { useEffect, useRef, useState } from "react";

import { LogEntryDetails } from "@/components/battle/panels/LogEntryDetails";
import { useBattleScene } from "@/lib/hooks/battle";
import { getLogEntryDetailLines } from "@/lib/utils/battle/battle-log-format";
import { sanitizeLogEntry } from "@/lib/utils/battle/view";

export function BattleLog() {
  const { battle, viewer, log } = useBattleScene();

  const [expanded, setExpanded] = useState<number | null>(log.focus);

  const focused = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focused.current?.scrollIntoView?.({ block: "nearest" });
  }, []);

  const entries = [...(battle.battleLog ?? [])].reverse().map((e) => sanitizeLogEntry(e, viewer));

  return (
    <div className="text-sm leading-5 text-[#cfc5b2]">
      {entries.map((e, i) => {
        const open = expanded === e.actionIndex;

        return (
          <div key={e.actionIndex} ref={e.actionIndex === log.focus ? focused : undefined} className="border-b border-white/[.06] py-2.5">
            {(i === 0 || entries[i - 1].round !== e.round) && <div className="text-xs text-[var(--hud-muted)]">Раунд {e.round}</div>}
            {getLogEntryDetailLines(e).length > 0 ? (
              <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : e.actionIndex)} className="w-full text-left">
                {e.resultText}
              </button>
            ) : (
              e.resultText
            )}
            {open && <LogEntryDetails action={e} />}
          </div>
        );
      })}
    </div>
  );
}
