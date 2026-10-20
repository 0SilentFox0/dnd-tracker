import type { ReactNode } from "react";

import { Portrait } from "@/components/battle/hud";
import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";

const TONE = {
  enemy: { on: "border-[var(--enemy)] bg-[var(--enemy)]/15", off: "border-white/15", extra: "", portrait: 36 },
  gold: { on: "border-[var(--gold)] bg-[var(--gold)]/10", off: "border-white/15", extra: "", portrait: 36 },
  parchment: { on: "border-[#7a2a1f] bg-[#7a2a1f]/10", off: "border-[#2a2018]/20", extra: "disabled:opacity-50", portrait: 32 },
} as const;

interface TargetButtonProps {
  participant: BattleParticipant;
  selected: boolean;
  tone: keyof typeof TONE;
  trailing?: ReactNode;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
}

export function TargetButton({ participant, selected, tone, trailing, disabled, compact, onClick }: TargetButtonProps) {
  const t = TONE[tone];

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn("flex w-full items-center border text-left", compact ? "h-11 gap-2 px-2" : "h-14 gap-3 px-3", t.extra, selected ? t.on : t.off)}
    >
      <Portrait participant={participant} size={compact ? 32 : t.portrait} />
      <span className={cn("hud-sc font-bold", compact && "min-w-0 flex-1 truncate")}>{participant.basicInfo.name}</span>
      {trailing}
    </button>
  );
}
