"use client";

import { ChevronsUp } from "lucide-react";

import { metalClass } from "@/components/battle/hud";
import { cn } from "@/lib/utils";

export function LevelUpBadge({ free, onOpen }: { free: number; onOpen: () => void }) {
  if (free === 0) return null;

  return (
    <button
      type="button"
      aria-label={`Вільні очки навичок: ${free}`}
      onClick={onOpen}
      className={cn("hud-sc metal-fill inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] leading-none", metalClass("gold"))}
    >
      <ChevronsUp aria-hidden className="size-3" />
      LVL UP +{free}
    </button>
  );
}
