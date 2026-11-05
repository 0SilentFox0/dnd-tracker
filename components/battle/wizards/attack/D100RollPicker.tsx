import { useState } from "react";
import { useTranslations } from "next-intl";

import { D100Input } from "@/components/battle/hud/D100Input";
import { AiRollButton } from "@/components/battle/hud/DiceInput";
import { cn } from "@/lib/utils";

export type RollSource = "server" | "manual";

export type FortuneChoice = "reroll" | "sl" | null;

const SOURCES: RollSource[] = ["server", "manual"];

const FORTUNE_OPTIONS: FortuneChoice[] = [null, "reroll", "sl"];

interface D100RollPickerProps {
  locked?: RollSource;
  fortune: { available: boolean; left: number; value: FortuneChoice; onChange: (value: FortuneChoice) => void };
  onRoll: (first: number, second?: number) => void;
  onAuto: () => void;
}

export function D100RollPicker({ locked, fortune, onRoll, onAuto }: D100RollPickerProps) {
  const t = useTranslations("battleWizards.attack.roll.d100");

  const tf = useTranslations("battleWfrp.ui.fortune");

  const [chosen, setSource] = useState<RollSource>("server");

  const [first, setFirst] = useState<number>();

  const source = locked ?? chosen;

  const pickFortune = (value: FortuneChoice) => {
    setFirst(undefined);
    fortune.onChange(value);
  };

  const manualRoll = () => {
    if (fortune.value !== "reroll") return <D100Input onRoll={onRoll} />;

    if (first === undefined) return (
      <>
        <div className="mt-3 text-sm text-hud-gold">{tf("firstRoll")}</div>
        <D100Input onRoll={setFirst} />
      </>
    );

    return (
      <>
        <div className="mt-3 text-sm text-hud-gold">{tf("secondRoll")}</div>
        <D100Input key="second" onRoll={(second) => onRoll(first, second)} />
      </>
    );
  };

  return (
    <>
      {!locked && (
        <div className="mt-3 grid h-10 grid-cols-2 border border-white/20">
          {SOURCES.map((m) => (
            <button key={m} type="button" aria-pressed={source === m} onClick={() => setSource(m)} className={cn("border-l border-white/20 text-sm first:border-l-0", source === m ? "bg-white/10 font-bold text-[var(--ink)]" : "text-hud-soft")}>{t(`mode.${m}`)}</button>
          ))}
        </div>
      )}
      {fortune.available && (
        <div className="mt-3">
          <div className="text-sm text-[var(--hud-muted)]">{tf("left", { count: fortune.left })}</div>
          <div role="group" aria-label={tf("label")} className="mt-1 grid h-9 grid-cols-3 border border-white/20">
            {FORTUNE_OPTIONS.map((m) => (
              <button key={m ?? "off"} type="button" aria-pressed={fortune.value === m} onClick={() => pickFortune(m)} className={cn("border-l border-white/20 text-sm first:border-l-0", fortune.value === m ? "bg-white/10 font-bold text-[var(--ink)]" : "text-hud-soft")}>{tf(m ?? "off")}</button>
            ))}
          </div>
        </div>
      )}
      {source === "manual" ? manualRoll() : <div className="mt-3"><AiRollButton onClick={onAuto} /></div>}
    </>
  );
}
