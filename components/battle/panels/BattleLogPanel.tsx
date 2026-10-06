"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ScrollText,
  Trash2,
} from "lucide-react";

import { LogEntryDetails } from "./LogEntryDetails";

import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { formatLogEntry } from "@/lib/utils/battle/battle-log-format";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

interface BattleLogPanelProps {
  battle: BattleScene;
  className?: string;
  isDM?: boolean;
  onRollback?: (actionIndex: number) => void;
  /** Контроль відкриття ззовні (наприклад з панелі швидких дій DM) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Відображати лише вміст логу в сайдбарі DM (без нижньої панелі з кнопкою) */
  embedInSidebar?: boolean;
}

export function BattleLogPanel({
  battle,
  className,
  isDM = false,
  onRollback,
  open: controlledOpen,
  onOpenChange,
  embedInSidebar = false,
}: BattleLogPanelProps) {
  const confirm = useConfirm();

  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const log = (battle.battleLog ?? []) as BattleAction[];

  const handleToggle = () => {
    if (onOpenChange) {
      onOpenChange(!open);
    } else {
      setInternalOpen((o) => !o);
    }
  };

  const logContent = (
    <div
      className={cn(
        "overflow-y-auto custom-scrollbar",
        embedInSidebar ? "h-[min(50vh,400px)] border border-[#3a2e22] bg-black/40" : "max-h-48 border-t border-[#3a2e22]",
      )}
    >
          <ul className="px-2 py-1 text-sm text-[#cfc5b2]">
            {log.length === 0 ? (
              <li className="py-2 italic text-[var(--hud-muted)]">Записів поки немає.</li>
            ) : (
              [...log].reverse().map((entry) => {
                const isExpanded = expandedId === entry.id;

                const hasDetails =
                  entry.actionDetails &&
                  (Object.keys(entry.actionDetails).length > 0 ||
                    (entry.hpChanges?.length ?? 0) > 0);

                return (
                  <li
                    key={entry.id}
                    className="border-b border-white/[.06] last:border-b-0"
                  >
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          hasDetails &&
                          setExpandedId(isExpanded ? null : entry.id)
                        }
                        className={cn(
                          "flex-1 min-w-0 flex gap-2 py-1.5 px-2 text-left text-sm",
                          hasDetails && "cursor-pointer hover:bg-[var(--gold)]/[.06]",
                        )}
                      >
                        {hasDetails ? (
                          isExpanded ? (
                            <ChevronDown className="size-4 shrink-0 text-[var(--hud-muted)]" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0 text-[var(--hud-muted)]" />
                          )
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <span className="shrink-0 pt-0.5 text-xs text-[var(--hud-muted)]">
                          Р{entry.round}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-medium",
                            entry.actorSide === "ally"
                              ? "text-[#8fb0d0]"
                              : "text-[#d0705c]",
                          )}
                        >
                          {entry.actorName}
                        </span>
                        <span className="min-w-0 truncate">
                          {formatLogEntry(entry)}
                        </span>
                      </button>
                      {isDM && onRollback && (
                        <button
                          type="button"
                          className="flex size-8 shrink-0 items-center justify-center text-[#d0705c] transition-colors hover:bg-[#d0705c]/15"
                          title="Відмінити дію (відкотити до стану перед нею)"
                          onClick={async () => {
                            if (
                              typeof window !== "undefined" &&
                              (await confirm({ title: "Відкотити бій до стану перед цією дією? Ця та всі наступні дії будуть видалені.", confirmLabel: "Підтвердити" }))
                            ) {
                              onRollback(entry.actionIndex);
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    {isExpanded && hasDetails && (
                      <div className="px-2 pb-2">
                        <LogEntryDetails action={entry} />
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
    </div>
  );

  if (embedInSidebar) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center justify-between gap-2 shrink-0">
          <span className="hud-sc flex items-center gap-2 text-[15px] tracking-[.08em] text-[var(--gold)]">
            <ScrollText className="size-4" />
            Лог бою
            {log.length > 0 && (
              <span className="font-sans text-xs tracking-normal text-[var(--hud-muted)]">({log.length})</span>
            )}
          </span>
          {onOpenChange && (
            <button
              type="button"
              className="h-8 px-2 text-[13px] text-[var(--hud-muted)] hover:text-[var(--ink)]"
              onClick={() => onOpenChange(false)}
            >
              Закрити
            </button>
          )}
        </div>
        {logContent}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "z-30 shrink-0 overflow-hidden border-t border-[#3a2e22] bg-[#14100c]/90 backdrop-blur-md",
        className,
      )}
    >
      <button
        type="button"
        className="hud-sc flex h-10 w-full items-center justify-between px-4 text-[15px] tracking-[.08em] text-[var(--gold)] hover:bg-[var(--gold)]/[.06]"
        onClick={handleToggle}
      >
        <span className="flex items-center gap-2">
          <ScrollText className="size-4" />
          Лог бою
          {log.length > 0 && (
            <span className="font-sans text-xs tracking-normal text-[var(--hud-muted)]">({log.length})</span>
          )}
        </span>
        {open ? (
          <ChevronUp className="size-4 text-[var(--hud-muted)]" />
        ) : (
          <ChevronDown className="size-4 text-[var(--hud-muted)]" />
        )}
      </button>
      {open && logContent}
    </div>
  );
}
