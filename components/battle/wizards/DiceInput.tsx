"use client";

import { Dices } from "lucide-react";

import { cn } from "@/lib/utils";

export function DiceGrid({ sides, value, onPick }: { sides: number; value?: number; onPick: (v: number) => void }) {
  return (
    <div className="mt-3 grid grid-cols-5 gap-1.5">
      {Array.from({ length: sides }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          className={cn(
            "flex h-12 items-center justify-center border text-lg font-medium",
            n === value ? "border-[#c0392b] bg-[var(--enemy)] font-bold text-white" : "border-white/15 bg-black/25 text-[var(--bone)]",
            n !== value && n === sides && sides === 20 && "text-[#e8c77a]",
            n !== value && n === 1 && "text-[#c98a7c]",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function DamageDice({ slots, values, onChange }: { slots: number[]; values: (number | undefined)[]; onChange: (i: number, v: number) => void }) {
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {slots.map((sides, i) => (
        <label key={i} className="flex flex-col gap-1 text-xs text-[var(--hud-muted)]">
          d{sides}
          <input
            aria-label={`Кубик ${i + 1} (d${sides})`}
            inputMode="numeric"
            pattern="[0-9]*"
            value={values[i] ?? ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);

              if (n >= 1 && n <= sides) onChange(i, n);
            }}
            className="h-12 border border-white/20 bg-black/30 text-center text-lg text-[var(--ink)]"
          />
        </label>
      ))}
    </div>
  );
}

export function AiRollButton({ onClick, label = "AI ROLL" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="hud-sc flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap border border-white/25 text-[15px] font-bold tracking-[.04em] text-[var(--bone)]">
      <Dices className="size-5" />
      {label}
    </button>
  );
}
