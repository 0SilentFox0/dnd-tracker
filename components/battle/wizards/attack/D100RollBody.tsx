import { useState } from "react";
import { useTranslations } from "next-intl";

import { type AttackWizardModel, btn } from "./shared";

import { D100Input } from "@/components/battle/hud/D100Input";
import { AiRollButton } from "@/components/battle/hud/DiceInput";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { lockedRollSource } from "@/lib/utils/battle/flows/attack-flow";

type RollSource = "server" | "manual";

const SOURCES: RollSource[] = ["server", "manual"];

const FORTUNE_OPTIONS = [null, "reroll", "sl"] as const;

export function D100RollBody({ wizard: { state, view, actions } }: { wizard: AttackWizardModel }) {
  const t = useTranslations("battleWizards.attack.roll.d100");

  const tc = useTranslations("common.actions");

  const text = useText();

  const [chosen, setSource] = useState<RollSource>("server");

  const locked = lockedRollSource(state);

  const source = locked ?? chosen;

  const { percentile, fortune } = view;

  const [first, setFirst] = useState<number>();

  const tf = useTranslations("battleWfrp.ui.fortune");

  const pickFortune = (value: (typeof FORTUNE_OPTIONS)[number]) => {
    setFirst(undefined);
    actions.setFortune(value);
  };

  const manualRoll = () => {
    if (state.fortune !== "reroll") return <D100Input onRoll={actions.roll} />;

    if (first === undefined) return <D100Input onRoll={setFirst} />;

    return (
      <>
        <div className="mt-3 text-sm text-hud-gold">{tf("secondRoll")}</div>
        <D100Input key="second" onRoll={(second) => actions.roll(first, second)} />
      </>
    );
  };

  return (
    <>
      {percentile.target && <div className="mt-2 text-sm text-hud-gold">{t("target", { target: percentile.target.target, label: text(percentile.target.label) })}</div>}
      {state.diceSlots.length > 0 && <div className="mt-1 text-sm text-[var(--hud-muted)]">{t("damageDice", { dice: state.diceSlots.map((sides) => `d${sides}`).join(" + ") })}</div>}
      <div className="mt-1 text-sm text-[var(--hud-muted)]">{percentile.momentum ? t("momentum.held", { side: t("momentum.side") }) : t("momentum.none")}</div>
      {!locked && (
        <div className="mt-3 grid h-10 grid-cols-2 border border-white/20">
          {SOURCES.map((m) => (
            <button key={m} type="button" aria-pressed={source === m} onClick={() => setSource(m)} className={cn("border-l border-white/20 text-sm first:border-l-0", source === m ? "bg-white/10 font-bold text-[var(--ink)]" : "text-hud-soft")}>{t(`mode.${m}`)}</button>
          ))}
        </div>
      )}
      {fortune.available && state.index === 0 && (
        <div className="mt-3">
          <div className="text-sm text-[var(--hud-muted)]">{tf("left", { count: fortune.left })}</div>
          <div role="group" aria-label={tf("label")} className="mt-1 grid h-9 grid-cols-3 border border-white/20">
            {FORTUNE_OPTIONS.map((m) => (
              <button key={m ?? "off"} type="button" aria-pressed={(state.fortune ?? null) === m} onClick={() => pickFortune(m)} className={cn("border-l border-white/20 text-sm first:border-l-0", (state.fortune ?? null) === m ? "bg-white/10 font-bold text-[var(--ink)]" : "text-hud-soft")}>{tf(m ?? "off")}</button>
            ))}
          </div>
        </div>
      )}
      {source === "manual" ? manualRoll() : <div className="mt-3"><AiRollButton onClick={actions.aiRoll} /></div>}
      <button type="button" onClick={actions.back} className={cn(btn, "mt-3 w-full border-white/25")}>{tc("back")}</button>
    </>
  );
}
