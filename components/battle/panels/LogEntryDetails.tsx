"use client";

import { getLogEntryDetailLines } from "@/lib/utils/battle/battle-log-format";
import type { BattleAction } from "@/types/battle";

interface LogEntryDetailsProps {
  action: BattleAction;
}

export function LogEntryDetails({ action }: LogEntryDetailsProps) {
  const lines = getLogEntryDetailLines(action);

  if (lines.length === 0) return null;

  return (
    <div className="mt-1.5 pl-4 border-l-2 border-white/20 text-xs text-white/70 space-y-0.5">
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
