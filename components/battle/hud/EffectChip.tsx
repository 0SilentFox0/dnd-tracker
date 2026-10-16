import { type KeyboardEvent, type MouseEvent, useState } from "react";

import { EffectIcon } from "./EffectIcon";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { effectSummary, mergeEffectsForDisplay } from "@/lib/utils/battle/view";
import type { ActiveEffect } from "@/types/battle";

const tone = (e: ActiveEffect) => (e.type === "buff" ? "text-[#cdb87e]" : "text-hud-danger");

function EffectChip({ effect }: { effect: ActiveEffect }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} aria-label={`${effect.name}: ${effectSummary(effect).join("; ")}`} className={cn("flex h-5 cursor-help items-center gap-1.5 whitespace-nowrap text-[13px] leading-5", tone(effect))}>
      <EffectIcon effect={effect} size={20} />
      <span className="text-[#d9cfbd]">{effect.name}</span>
      {!effect.permanent && <span className="opacity-70">{effect.duration}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4} className="max-w-64 border border-white/15 bg-[#17130f] text-[13px] leading-[18px] text-[#d9cfbd] shadow-lg [&>span]:hidden">
          <div className="font-medium text-[var(--ink)]">{effect.name}</div>
          {effectSummary(effect).map((line) => <div key={line}>{line}</div>)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function EffectLine({ effects: raw, max = 2 }: { effects: ActiveEffect[]; max?: number }) {
  const effects = mergeEffectsForDisplay(raw);

  const [expanded, setExpanded] = useState(false);

  const overflow = effects.length > max;

  const open = expanded && overflow;

  const shown = open ? effects : effects.slice(0, max);

  // Рядок учасника сам є кнопкою, тому перемикач — span, що не пропускає клік до рядка.
  const toggle = (e: MouseEvent | KeyboardEvent) => {
    if ("key" in e && e.key !== "Enter" && e.key !== " ") return;

    e.stopPropagation();
    e.preventDefault();
    setExpanded((v) => !v);
  };

  return (
    <div className={cn("mt-1.5 flex items-center gap-x-3", open ? "flex-wrap gap-y-1" : "h-5 overflow-hidden")}>
      {shown.map((e) => <EffectChip key={e.id} effect={e} />)}
      {overflow && (
        <span
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-label={open ? "Згорнути ефекти" : `Показати всі ефекти (${effects.length})`}
          onClick={toggle}
          onKeyDown={toggle}
          className="cursor-pointer whitespace-nowrap rounded px-1 text-[13px] leading-5 text-[var(--hud-muted)] hover:bg-white/10 hover:text-[#d9cfbd]"
        >
          {open ? "згорнути" : `+${effects.length - max}`}
        </span>
      )}
    </div>
  );
}
