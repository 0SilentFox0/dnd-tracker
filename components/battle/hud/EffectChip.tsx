import Image from "next/image";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ActiveEffect } from "@/types/battle";

const tone = (e: ActiveEffect) => (e.type === "buff" ? "text-[#cdb87e]" : "text-[#d0705c]");

function EffectChip({ effect }: { effect: ActiveEffect }) {
  const icon = effect.icon ?? effect.source?.icon;

  return (
    <span className={cn("flex h-5 items-center gap-1.5 whitespace-nowrap text-[13px] leading-5", tone(effect))}>
      <span className="flex size-5 items-center justify-center border border-current bg-black/40">
        {icon ? <Image src={icon} alt="" width={14} height={14} className="size-3.5 object-contain" /> : <Sparkles className="size-3.5" />}
      </span>
      <span className="text-[#d9cfbd]">{effect.name}</span>
      <span className="opacity-70">{effect.duration}</span>
    </span>
  );
}

export function EffectLine({ effects, max = 2 }: { effects: ActiveEffect[]; max?: number }) {
  const shown = effects.slice(0, max);

  return (
    <div className="mt-1.5 flex h-5 items-center gap-3 overflow-hidden">
      {shown.map((e) => <EffectChip key={e.id} effect={e} />)}
      {effects.length > max && <span className="text-[13px] text-[var(--muted)]">+{effects.length - max}</span>}
    </div>
  );
}
