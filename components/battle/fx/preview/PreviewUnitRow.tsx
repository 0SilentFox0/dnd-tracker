"use client";

import { AuraCanvas } from "@/components/battle/fx/auras/AuraCanvas";
import { FRAMES } from "@/components/battle/fx/frames";
import { CanvasFrame } from "@/components/battle/fx/frames/CanvasFrame";
import { cn } from "@/lib/utils";
import type { PreviewUnit, SpellFxTarget } from "@/lib/utils/battle/fx";

const HP: Record<PreviewUnit["id"], number> = { caster: 1, ally: 0.2, fallen: 0, e1: 1, e2: 1 };

const ROW_LOOK = {
  hud: {
    row: "rounded-lg border border-white/[.08] bg-black/30 text-[var(--ink,#efe5d2)]",
    portrait: "bg-[#241d16] text-[var(--bone,#e6dccb)]",
    ring: "#000",
    fallenName: "text-hud-muted",
    track: "h-1 bg-white/10",
    bar: { ally: "bg-[#c0392b]", enemy: "bg-[#c0392b]" },
  },
  book: {
    row: "rounded-[3px] border border-[#3b2716]/70 bg-[#e6d9bf] text-[#2a2018] shadow-[0_1px_3px_rgba(0,0,0,.45),inset_0_0_0_2px_rgba(226,214,191,.6)]",
    portrait: "bg-[#3b2a1c] text-[#e6d9bf]",
    ring: "#2a1d14",
    fallenName: "text-[#7a6650]",
    track: "h-[3px] bg-[#2a1d14]/20",
    bar: { ally: "bg-[#4a6b3a]", enemy: "bg-[#8a2e22]" },
  },
};

const ROW_SIZE = {
  regular: { portrait: 40, row: "min-h-[60px] px-3 py-2 text-sm" },
  compact: { portrait: 32, row: "min-h-[46px] px-2.5 py-1.5 text-xs" },
};

interface RowLook {
  /** Auras paint one static frame (reduced motion). */
  still: boolean;
  compact: boolean;
  /** The light parchment of the spellbook. */
  book: boolean;
}

interface Props {
  unit: PreviewUnit;
  target: SpellFxTarget | undefined;
  /** Remount key and delay of the hit frame; null — no frame. */
  hit: { token: number; delayMs: number } | null;
  aurasOn: boolean;
  look?: Partial<RowLook>;
}

export function PreviewUnitRow({ unit, target, hit, aurasOn, look = {} }: Props) {
  const { still = false, compact = false, book = false } = look;

  const tone = ROW_LOOK[book ? "book" : "hud"];

  const size = ROW_SIZE[compact ? "compact" : "regular"];

  const fallen = unit.id === "fallen";

  return (
    <div data-fx-participant={unit.id} className={cn("relative flex items-center gap-2.5 font-bold", tone.row, size.row)}>
      {hit && target?.frame ? <CanvasFrame key={hit.token} frame={FRAMES[target.frame]} delayMs={hit.delayMs} light={book} /> : null}
      <span className="relative shrink-0">
        <span
          className={cn("flex items-center justify-center rounded-full text-xs", tone.portrait, fallen && "opacity-50 grayscale")}
          style={{ width: size.portrait, height: size.portrait, boxShadow: `0 0 0 2px ${unit.side === "ally" ? "var(--ally, #6f8fb0)" : "var(--enemy, #9c2a1d)"}, 0 0 0 3px ${tone.ring}` }}
        >
          {fallen ? "†" : unit.name.slice(0, 2)}
        </span>
        {aurasOn && target?.auras.length ? <AuraCanvas kinds={target.auras} size={size.portrait} still={still} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate", fallen && tone.fallenName)}>{unit.name}</span>
        <span className={cn("mt-1 block rounded-full", tone.track)}>
          <span className={cn("block h-full rounded-full", tone.bar[unit.side])} style={{ width: `${HP[unit.id] * 100}%` }} />
        </span>
      </span>
    </div>
  );
}
