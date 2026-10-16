"use client";

import { Dices } from "lucide-react";

import { cn } from "@/lib/utils";
import { parseDieInput } from "@/lib/utils/battle/flows";

export function DiceGrid({ sides, value, onPick, highlight }: { sides: number; value?: number; onPick: (v: number) => void; highlight?: { rolls: number[]; tone: "gold" | "danger" } }) {
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
            n !== value && highlight?.rolls.includes(n) && (highlight.tone === "gold" ? "border-[#e6c25a] bg-[#e6c25a]/20 font-bold text-[#ffe08a]" : "border-[#c0392b] bg-[#c0392b]/25 font-bold text-[#ff8a7a]"),
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/** Поле одного кубика: при фокусі вміст виділено, нова цифра замінює стару, Backspace очищає. */
export function DieInput({ sides, value, onChange, label, className }: { sides: number; value: number | undefined; onChange: (v: number | undefined) => void; label: string; className?: string }) {
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      pattern="[0-9]*"
      value={value ?? ""}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const v = parseDieInput(e.target.value, sides);

        if (v !== null) onChange(v);
      }}
      className={className}
    />
  );
}

/** parchment — для світлої книги заклять: темний текст і рамки замість світлих HUD-кольорів. */
type Tone = "hud" | "parchment";

export function DamageDice({ slots, values, onChange, tone = "hud" }: { slots: number[]; values: (number | undefined)[]; onChange: (i: number, v: number | undefined) => void; tone?: Tone }) {
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {slots.map((sides, i) => (
        <label key={i} className={cn("flex flex-col gap-1 text-xs", tone === "parchment" ? "text-[#6b5a44]" : "text-[var(--hud-muted)]")}>
          d{sides}
          <DieInput label={`Кубик ${i + 1} (d${sides})`} sides={sides} value={values[i]} onChange={(v) => onChange(i, v)} className={cn("h-12 border text-center text-lg", tone === "parchment" ? "border-[#2a2018]/35 bg-white/40 text-[#2a2018]" : "border-white/20 bg-black/30 text-[var(--ink)]")} />
        </label>
      ))}
    </div>
  );
}

export function AiRollButton({ onClick, label = "Авто-кидок", tone = "hud" }: { onClick: () => void; label?: string; tone?: Tone }) {
  return (
    <button type="button" onClick={onClick} className={cn("hud-sc flex h-[52px] w-full items-center justify-center gap-2.5 whitespace-nowrap border text-[15px] font-bold tracking-[.04em]", tone === "parchment" ? "border-[#2a2018]/40 text-[#2a2018]" : "border-white/25 text-[var(--bone)]")}>
      <Dices className="size-5" />
      {label}
    </button>
  );
}
