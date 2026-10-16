import { Sparkles } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { effectSummary } from "@/lib/utils/battle/view";
import type { ActiveEffect } from "@/types/battle";

const tone = (e: ActiveEffect) => (e.type === "buff" ? "text-[#cdb87e]" : "text-hud-danger");

function EffectChip({ effect }: { effect: ActiveEffect }) {
  const icon = effect.icon ?? effect.source?.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} aria-label={`${effect.name}: ${effectSummary(effect).join("; ")}`} className={cn("flex h-5 cursor-help items-center gap-1.5 whitespace-nowrap text-[13px] leading-5", tone(effect))}>
      <span className="flex size-5 items-center justify-center border border-current bg-black/40">
        {icon ? <OptimizedImage src={icon} alt="" width={14} height={14} className="size-3.5 object-contain" /> : <Sparkles className="size-3.5" />}
      </span>
      <span className="text-[#d9cfbd]">{effect.name}</span>
      <span className="opacity-70">{effect.duration}</span>
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

export function EffectLine({ effects, max = 2 }: { effects: ActiveEffect[]; max?: number }) {
  const shown = effects.slice(0, max);

  return (
    <div className="mt-1.5 flex h-5 items-center gap-3 overflow-hidden">
      {shown.map((e) => <EffectChip key={e.id} effect={e} />)}
      {effects.length > max && <span className="text-[13px] text-[var(--hud-muted)]">+{effects.length - max}</span>}
    </div>
  );
}
