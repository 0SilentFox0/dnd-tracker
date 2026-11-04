"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { DieInput } from "./DiceInput";

import { cn } from "@/lib/utils";
import { composePercentile, PERCENTILE_SIDES, TENS_OPTIONS } from "@/lib/utils/battle/flows";

const UNITS_OPTIONS = Array.from({ length: 10 }, (_, i) => i);

const cell = (active: boolean) => cn("flex h-11 items-center justify-center border text-base font-medium", active ? "border-[#c0392b] bg-[var(--enemy)] font-bold text-white" : "border-white/15 bg-black/25 text-[var(--bone)]");

export function D100Input({ onRoll }: { onRoll: (value: number) => void }) {
  const t = useTranslations("battle.hud.d100");

  const [tens, setTens] = useState<number>();

  const [units, setUnits] = useState<number>();

  const [typed, setTyped] = useState<number>();

  const pair = composePercentile(tens, units);

  const value = typed ?? pair;

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div role="group" aria-label={t("tens")} className="grid grid-cols-5 gap-1.5">
        {TENS_OPTIONS.map((n) => (
          <button key={n} type="button" aria-pressed={n === tens} onClick={() => { setTyped(undefined); setTens(n); }} className={cell(n === tens)}>
            {String(n).padStart(2, "0")}
          </button>
        ))}
      </div>
      <div role="group" aria-label={t("units")} className="grid grid-cols-5 gap-1.5">
        {UNITS_OPTIONS.map((n) => (
          <button key={n} type="button" aria-pressed={n === units} onClick={() => { setTyped(undefined); setUnits(n); }} className={cell(n === units)}>
            {n}
          </button>
        ))}
      </div>
      <DieInput label={t("field")} sides={PERCENTILE_SIDES} value={typed ?? pair} onChange={setTyped} className="h-12 border border-white/20 bg-black/30 text-center text-lg text-[var(--ink)]" />
      <button type="button" disabled={value === undefined} onClick={() => value !== undefined && onRoll(value)} className="hud-sc h-[52px] w-full border border-white/25 text-[15px] font-bold tracking-[.04em] text-[var(--bone)] disabled:opacity-40">
        {t("roll")}
      </button>
    </div>
  );
}
