import { useState } from "react";

import { EffectIcon } from "./EffectIcon";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { effectSummary } from "@/lib/utils/battle/view";
import type { ActiveEffect } from "@/types/battle";

const tone = (e: ActiveEffect) => (e.type === "buff" ? "text-[#cdb87e]" : "text-hud-danger");

function EffectChip({ effect }: { effect: ActiveEffect }) {
  const summary = effectSummary(effect);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label={`${effect.name}: ${summary.join("; ")}`} className={cn("relative flex h-5 cursor-help items-center gap-1.5 whitespace-nowrap text-[13px] leading-5", tone(effect))}>
          <EffectIcon effect={effect} size={20} />
          <span className="text-[#d9cfbd]">{effect.name}</span>
          {!effect.permanent && <span className="opacity-70">{effect.duration}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4} className="max-w-64 border border-white/15 bg-[#17130f] text-[13px] leading-[18px] text-[#d9cfbd] shadow-lg [&>span]:hidden">
        <div className="font-medium text-[var(--ink)]">{effect.name}</div>
        {summary.map((line) => <div key={line}>{line}</div>)}
      </TooltipContent>
    </Tooltip>
  );
}

export function EffectLine({ effects, max = 2 }: { effects: ActiveEffect[]; max?: number }) {
  const [expanded, setExpanded] = useState(false);

  const overflow = effects.length > max;

  const open = expanded && overflow;

  const shown = open ? effects : effects.slice(0, max);

  return (
    <div className={cn("mt-1.5 flex items-center gap-x-3", open ? "flex-wrap gap-y-1" : "h-5 overflow-hidden")}>
      {shown.map((e) => <EffectChip key={e.id} effect={e} />)}
      {overflow && (
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Згорнути ефекти" : `Показати всі ефекти (${effects.length})`}
          onClick={() => setExpanded((v) => !v)}
          className="relative cursor-pointer whitespace-nowrap rounded px-1 text-[13px] leading-5 text-[var(--hud-muted)] hover:bg-white/10 hover:text-[#d9cfbd]"
        >
          {open ? "згорнути" : `+${effects.length - max}`}
        </button>
      )}
    </div>
  );
}
