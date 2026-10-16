"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LogEntryCard } from "./log/LogEntryCard";
import { RoundHeader } from "./log/RoundHeader";

import { BattleLogLoadEarlier } from "@/components/battle/panels/BattleLogLoadEarlier";
import { useBattleScene } from "@/lib/hooks/battle";
import { groupLogByRound, sanitizeLogEntry } from "@/lib/utils/battle/view";

export function BattleLog() {
  const { battle, viewer, log } = useBattleScene();

  const [expanded, setExpanded] = useState<number | null>(log.focus);

  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set());

  const focused = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focused.current?.scrollIntoView?.({ block: "nearest" });
  }, []);

  const { battleLog, initiativeOrder } = battle;

  const groups = useMemo(() => groupLogByRound([...(battleLog ?? [])].reverse().map((e) => sanitizeLogEntry(e, viewer))), [battleLog, viewer]);

  const byId = useMemo(() => new Map(initiativeOrder.map((p) => [p.basicInfo.id, p])), [initiativeOrder]);

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
        <div key={g.round}>
          <RoundHeader round={g.round} count={g.entries.length} collapsed={collapsed.has(g.round)} onToggle={toggleRound} />
          {!collapsed.has(g.round) && g.entries.map((e) => (
            <div key={e.actionIndex} ref={e.actionIndex === log.focus ? focused : undefined}>
              <LogEntryCard entry={e} actor={byId.get(e.actorId)} open={expanded === e.actionIndex} onToggle={toggleEntry} />
            </div>
          ))}
        </div>
      ))}
      <BattleLogLoadEarlier />
    </div>
  );
}
