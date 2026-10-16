import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LogEntryCard } from "./LogEntryCard";
import { RoundHeader } from "./RoundHeader";

import { groupLogByRound } from "@/lib/utils/battle/view";
import type { BattleAction, BattleParticipant } from "@/types/battle";

/** Записи від нових до старих, згруповані по раундах; `renderActions` — слот дій на картці (відкіт для DM). */
export function LogTimeline({ entries, participants, focus = null, renderActions }: {
  entries: BattleAction[];
  participants: BattleParticipant[];
  focus?: number | null;
  renderActions?: (entry: BattleAction) => ReactNode;
}) {
  const [expanded, setExpanded] = useState<number | null>(focus);

  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set());

  const focused = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focused.current?.scrollIntoView?.({ block: "nearest" });
  }, []);

  const groups = useMemo(() => groupLogByRound(entries), [entries]);

  const byId = useMemo(() => new Map(participants.map((p) => [p.basicInfo.id, p])), [participants]);

  const toggleRound = useCallback((round: number) => setCollapsed((prev) => {
    const next = new Set(prev);

    if (!next.delete(round)) next.add(round);

    return next;
  }), []);

  const toggleEntry = useCallback((actionIndex: number) => setExpanded((cur) => (cur === actionIndex ? null : actionIndex)), []);

  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.round));

  const toggleAll = () => {
    setExpanded(null);
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.round)));
  };

  return (
    <div className="pb-2 text-sm leading-5 text-[#cfc5b2]">
      {groups.length > 1 && (
        <div className="flex justify-end pt-1">
          <button type="button" onClick={toggleAll} className="text-[12px] text-[var(--hud-muted)] hover:text-[var(--ink)]">
            {allCollapsed ? "Розгорнути всі" : "Згорнути всі"}
          </button>
        </div>
      )}
      {groups.map((g) => (
        <div key={`${g.round}:${g.entries[0].actionIndex}`}>
          <RoundHeader round={g.round} count={g.entries.length} collapsed={collapsed.has(g.round)} onToggle={toggleRound} />
          {!collapsed.has(g.round) && g.entries.map((e) => (
            <div key={e.actionIndex} ref={e.actionIndex === focus ? focused : undefined}>
              <LogEntryCard entry={e} actor={byId.get(e.actorId)} open={expanded === e.actionIndex} onToggle={toggleEntry} actions={renderActions?.(e)} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
