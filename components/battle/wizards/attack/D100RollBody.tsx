import { useState } from "react";
import { useTranslations } from "next-intl";

import { type AttackWizardModel, btn } from "./shared";

import { D100Input } from "@/components/battle/hud/D100Input";
import { AiRollButton } from "@/components/battle/hud/DiceInput";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";

type RollSource = "server" | "manual";

const SOURCES: RollSource[] = ["server", "manual"];

export function D100RollBody({ wizard: { view, actions } }: { wizard: AttackWizardModel }) {
  const t = useTranslations("battleWizards.attack.roll.d100");

  const tc = useTranslations("common.actions");

  const text = useText();

  const [source, setSource] = useState<RollSource>("server");

  const { percentile } = view;

  return (
    <>
      {percentile.target && <div className="mt-2 text-sm text-hud-gold">{t("target", { target: percentile.target.target, label: text(percentile.target.label) })}</div>}
      <div className="mt-1 text-sm text-[var(--hud-muted)]">{percentile.momentum ? t("momentum.held", { side: t("momentum.side") }) : t("momentum.none")}</div>
      <div className="mt-3 grid h-10 grid-cols-2 border border-white/20">
        {SOURCES.map((m) => (
          <button key={m} type="button" aria-pressed={source === m} onClick={() => setSource(m)} className={cn("border-l border-white/20 text-sm first:border-l-0", source === m ? "bg-white/10 font-bold text-[var(--ink)]" : "text-hud-soft")}>{t(`mode.${m}`)}</button>
        ))}
      </div>
      {source === "manual" ? <D100Input onRoll={actions.roll} /> : <div className="mt-3"><AiRollButton onClick={actions.aiRoll} /></div>}
      <button type="button" onClick={actions.back} className={cn(btn, "mt-3 w-full border-white/25")}>{tc("back")}</button>
    </>
  );
}
