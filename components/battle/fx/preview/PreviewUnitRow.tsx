"use client";

import { AuraCanvas } from "@/components/battle/fx/auras/canvas/AuraCanvas";
import { FRAMES } from "@/components/battle/fx/frames/canvas";
import { CanvasFrame } from "@/components/battle/fx/frames/canvas/CanvasFrame";
import { cn } from "@/lib/utils";
import type { PreviewUnit } from "@/lib/utils/battle/fx/preview-units";
import type { SpellFxTarget } from "@/lib/utils/battle/fx/spell-preview";

const HP: Record<PreviewUnit["id"], number> = { caster: 1, ally: 0.2, fallen: 0, e1: 1, e2: 1 };

export interface PreviewUnitRowProps {
  unit: PreviewUnit;
  target: SpellFxTarget | undefined;
  /** Remount key and delay of the hit frame; null — no frame. */
  hit: { token: number; delayMs: number } | null;
  aurasOn: boolean;
  still?: boolean;
  compact?: boolean;
}

export function PreviewUnitRow({ unit, target, hit, aurasOn, still = false, compact = false }: PreviewUnitRowProps) {
  const portrait = compact ? 32 : 40;

  const fallen = unit.id === "fallen";

  return (
    <div
      data-fx-participant={unit.id}
      className={cn("relative flex items-center gap-2.5 rounded-lg border border-white/[.08] bg-black/30 font-bold text-[var(--ink,#efe5d2)]", compact ? "min-h-[46px] px-2.5 py-1.5 text-xs" : "min-h-[60px] px-3 py-2 text-sm")}
    >
      {hit && target?.frame ? <CanvasFrame key={hit.token} frame={FRAMES[target.frame]} delayMs={hit.delayMs} /> : null}
      <span className="relative shrink-0">
        <span
          className={cn("flex items-center justify-center rounded-full bg-[#241d16] text-xs text-[var(--bone,#e6dccb)]", fallen && "opacity-50 grayscale")}
          style={{ width: portrait, height: portrait, boxShadow: `0 0 0 2px ${unit.side === "ally" ? "var(--ally, #6f8fb0)" : "var(--enemy, #9c2a1d)"}, 0 0 0 3px #000` }}
        >
          {fallen ? "†" : unit.name.slice(0, 2)}
        </span>
        {aurasOn && target?.auras.length ? <AuraCanvas kinds={target.auras} size={portrait} still={still} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate", fallen && "text-hud-muted")}>{unit.name}</span>
        <span className="mt-1 block h-1 rounded-full bg-white/10">
          <span className="block h-full rounded-full bg-[#c0392b]" style={{ width: `${HP[unit.id] * 100}%` }} />
        </span>
      </span>
    </div>
  );
}
