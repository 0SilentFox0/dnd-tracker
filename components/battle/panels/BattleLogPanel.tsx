"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ScrollText,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLogEntry } from "@/lib/utils/battle/battle-log-format";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

import { LogEntryDetails } from "./LogEntryDetails";

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
        embedInSidebar ? "h-[min(50vh,400px)] border border-white/10 rounded-md" : "max-h-48 border-t border-white/10",
      )}
    >
          <ul className="p-3 space-y-1.5 text-sm">
            {log.length === 0 ? (
              <li className="text-white/50 italic py-2">Записів поки немає.</li>
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
                    className="rounded bg-white/5 border border-white/5 overflow-hidden"
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
                          hasDetails && "cursor-pointer hover:bg-white/5",
                        )}
                      >
                        {hasDetails ? (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-white/50" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
                          )
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <span className="shrink-0 text-white/50 font-mono text-xs">
                          Р{entry.round}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-medium",
                            entry.actorSide === "ally"
                              ? "text-blue-400"
                              : "text-red-400",
                          )}
                        >
                          {entry.actorName}
                        </span>
                        <span className="text-white/80 truncate min-w-0">
                          {formatLogEntry(entry)}
                        </span>
                      </button>
                      {isDM && onRollback && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          title="Відмінити дію (відкотити до стану перед нею)"
                          onClick={() => {
                            if (
                              typeof window !== "undefined" &&
                              window.confirm(
                                "Відкотити бій до стану перед цією дією? Ця та всі наступні дії будуть видалені.",
                              )
                            ) {
                              onRollback(entry.actionIndex);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
          <span className="flex items-center gap-2 font-medium text-sm text-white/90">
            <ScrollText className="h-4 w-4" />
            Лог бою
            {log.length > 0 && (
              <span className="text-xs text-white/50">({log.length})</span>
            )}
          </span>
          {onOpenChange && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white h-8 px-2"
              onClick={() => onOpenChange(false)}
            >
              Закрити
            </Button>
          )}
        </div>
        {logContent}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 border-t border-white/10 bg-black/40 backdrop-blur-md z-30 overflow-hidden",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between rounded-none h-10 px-4 text-white/80 hover:text-white hover:bg-white/10"
        onClick={handleToggle}
      >
        <span className="flex items-center gap-2 font-medium">
          <ScrollText className="h-4 w-4" />
          Лог бою
          {log.length > 0 && (
            <span className="text-xs text-white/50">({log.length})</span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
      {open && logContent}
    </div>
  );
}
