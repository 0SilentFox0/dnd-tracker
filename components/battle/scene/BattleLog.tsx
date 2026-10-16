"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Frown, Hourglass, type LucideIcon, ScrollText, Shield, Sparkles, Star, Swords, Zap } from "lucide-react";

import { Portrait } from "@/components/battle/hud";
import { BattleLogLoadEarlier } from "@/components/battle/panels/BattleLogLoadEarlier";
import { LogEntryDetails } from "@/components/battle/panels/LogEntryDetails";
import { ParticipantSide } from "@/lib/constants/battle";
import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { getLogEntryDetailLines } from "@/lib/utils/battle/battle-log-format";
import { logEntryView, sanitizeLogEntry } from "@/lib/utils/battle/view";
import type { BattleAction } from "@/types/battle";

const ICON: Record<BattleAction["actionType"], LucideIcon> = {
  attack: Swords,
  spell: Sparkles,
  bonus_action: Zap,
  ability: Star,
  end_turn: Hourglass,
  skip_turn: Hourglass,
  morale_skip: Frown,
  retaliation: Shield,
};

const KIND: Record<BattleAction["actionType"], string> = {
  attack: "атака",
  spell: "заклинання",
  bonus_action: "бонусна дія",
  ability: "вміння",
  end_turn: "кінець ходу",
  skip_turn: "пропуск ходу",
  morale_skip: "мораль",
  retaliation: "відповідь",
};

export function BattleLog() {
  const { battle, viewer, log } = useBattleScene();

  const [expanded, setExpanded] = useState<number | null>(log.focus);

  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set());

  const toggleRound = (round: number) => setCollapsed((prev) => {
    const next = new Set(prev);

    if (!next.delete(round)) next.add(round);

    return next;
  });

  const focused = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focused.current?.scrollIntoView?.({ block: "nearest" });
  }, []);

  const entries = [...(battle.battleLog ?? [])].reverse().map((e) => sanitizeLogEntry(e, viewer));

  const byId = new Map(battle.initiativeOrder.map((p) => [p.basicInfo.id, p]));

  const rounds = [...new Set(entries.map((e) => e.round))];

  const allCollapsed = rounds.length > 0 && rounds.every((r) => collapsed.has(r));

  const toggleAll = () => {
    setExpanded(null);
    setCollapsed(allCollapsed ? new Set() : new Set(rounds));
  };

  return (
    <div className="pb-2 text-sm leading-5 text-[#cfc5b2]">
      {rounds.length > 1 && (
        <div className="flex justify-end pt-1">
          <button type="button" onClick={toggleAll} className="text-[12px] text-[var(--hud-muted)] hover:text-[var(--ink)]">
            {allCollapsed ? "Розгорнути всі" : "Згорнути всі"}
          </button>
        </div>
      )}
      {entries.map((e, i) => {
        const open = expanded === e.actionIndex;

        const view = logEntryView(e);

        const actor = byId.get(e.actorId);

        const Icon = ICON[e.actionType] ?? Sparkles;

        const hasDetails = getLogEntryDetailLines(e).length > 0;

        const enemy = e.actorSide === ParticipantSide.ENEMY;

        return (
          <div key={e.actionIndex} ref={e.actionIndex === log.focus ? focused : undefined}>
            {(i === 0 || entries[i - 1].round !== e.round) && (
              <button type="button" aria-expanded={!collapsed.has(e.round)} onClick={() => toggleRound(e.round)} className="hud-sc sticky top-0 z-[1] flex w-full items-center gap-2 bg-[#120e0b]/95 py-1.5 text-xs tracking-[.08em] text-[var(--hud-muted)] hover:text-[var(--ink)]">
                <span className="h-px flex-1 bg-white/10" />
                <ChevronDown className={cn("size-3.5 transition-transform", collapsed.has(e.round) && "-rotate-90")} />
                Раунд {e.round}
                {collapsed.has(e.round) && <span className="font-sans text-[11px] tracking-normal">· {entries.filter((x) => x.round === e.round).length}</span>}
                <span className="h-px flex-1 bg-white/10" />
              </button>
            )}
            {!collapsed.has(e.round) && <div className={cn("my-1.5 flex gap-2.5 rounded-sm border-l-2 bg-white/[.03] px-2.5 py-2", enemy ? "border-hud-danger/70" : "border-[#7fa86a]/70", e.isCancelled && "opacity-40 line-through")}>
              <span className="relative mt-0.5 shrink-0">
                {actor ? <Portrait participant={actor} size={28} /> : <span className="flex size-7 items-center justify-center rounded-full bg-white/5 text-[var(--hud-muted)] ring-1 ring-white/10"><ScrollText className="size-3.5" /></span>}
                <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#1a140f] text-[var(--gold)] ring-1 ring-white/15">
                  <Icon className="size-2.5" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-baseline gap-1.5 text-[11.5px] leading-4">
                  <span className={cn("hud-sc font-bold", enemy ? "text-[#ff8a7a]" : "text-[#a8d48f]")}>{actor?.basicInfo.name ?? (e.actorName || "Бій")}</span>
                  <span className="text-[var(--hud-muted)]">· {actor ? (KIND[e.actionType] ?? "подія") : "тригери"}</span>
                </div>
                <div className="text-[13.5px] font-medium leading-[18px] text-[var(--ink)]">{view.headline}</div>
                {view.lines.map((line, n) => (
                  <div key={n} className="mt-0.5 text-[12.5px] leading-[17px] text-[#b3a791]">{line}</div>
                ))}
                {view.hp.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {view.hp.map((h) => (
                      <span key={h.id} className={cn("rounded-sm px-1.5 text-[12px] leading-[18px]", h.delta < 0 ? "bg-hud-danger/15 text-[#ff8a7a]" : "bg-[#7fa86a]/15 text-[#a8d48f]")}>
                        {h.name} {h.delta > 0 ? `+${h.delta}` : `−${-h.delta}`}
                      </span>
                    ))}
                  </div>
                )}
                {hasDetails && (
                  <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : e.actionIndex)} className="mt-1 flex items-center gap-1 text-[12px] text-[var(--hud-muted)] hover:text-[var(--ink)]">
                    <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
                    {open ? "Сховати деталі" : "Деталі"}
                  </button>
                )}
                {open && <LogEntryDetails action={e} />}
              </div>
            </div>}
          </div>
        );
      })}
      <BattleLogLoadEarlier />
    </div>
  );
}
