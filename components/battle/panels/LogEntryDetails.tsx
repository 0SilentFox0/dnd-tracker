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
    <div className="mt-1.5 space-y-0.5 border-l-2 border-[#4a3c2c] pl-4 text-xs text-[#a89c88]">
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
