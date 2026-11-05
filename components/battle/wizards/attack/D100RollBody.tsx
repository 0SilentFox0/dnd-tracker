import { useTranslations } from "next-intl";

import { D100RollPicker } from "./D100RollPicker";
import { type AttackWizardModel, btn } from "./shared";

import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { lockedRollSource } from "@/lib/utils/battle/flows/attack-flow";

export function D100RollBody({ wizard: { state, view, actions } }: { wizard: AttackWizardModel }) {
  const t = useTranslations("battleWizards.attack.roll.d100");

  const tc = useTranslations("common.actions");

  const text = useText();

  const { percentile, fortune } = view;

  return (
    <>
      {percentile.target && <div className="mt-2 text-sm text-hud-gold">{t("target", { target: percentile.target.target, label: text(percentile.target.label) })}</div>}
      {state.diceSlots.length > 0 && <div className="mt-1 text-sm text-[var(--hud-muted)]">{t("damageDice", { dice: state.diceSlots.map((sides) => `d${sides}`).join(" + ") })}</div>}
      <div className="mt-1 text-sm text-[var(--hud-muted)]">{percentile.momentum ? t("momentum.held", { side: t("momentum.side") }) : t("momentum.none")}</div>
      <D100RollPicker
        locked={lockedRollSource(state)}
        fortune={{ available: fortune.available && state.index === 0, left: fortune.left, value: state.fortune ?? null, onChange: actions.setFortune }}
        onRoll={actions.roll}
        onAuto={actions.aiRoll}
      />
      <button type="button" onClick={actions.back} className={cn(btn, "mt-3 w-full border-white/25")}>{tc("back")}</button>
    </>
  );
}
