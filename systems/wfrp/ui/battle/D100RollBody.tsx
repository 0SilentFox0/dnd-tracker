import { useTranslations } from "next-intl";

import { heldBy } from "../../rules/combat/momentum";
import { SCENE_SLOT } from "../../rules/slots";
import { D100RollPicker } from "./D100RollPicker";

import { btn } from "@/components/battle/wizards/attack/shared";
import type { RollBodyProps } from "@/components/systems/types";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { lockedRollSource } from "@/lib/utils/battle/flows/attack-flow";

export function D100RollBody({ wizard: { state, view, actions } }: RollBodyProps) {
  const t = useTranslations("battleWizards.attack.roll.d100");

  const tc = useTranslations("common.actions");

  const text = useText();

  const { judged, fortune } = view;

  const momentum = judged.attackerSide !== undefined && heldBy(SCENE_SLOT.read(judged.sceneState) ?? {}, judged.attackerSide);

  return (
    <>
      {judged.target && <div className="mt-2 text-sm text-hud-gold">{t("target", { target: judged.target.target, label: text(judged.target.label) })}</div>}
      {state.diceSlots.length > 0 && <div className="mt-1 text-sm text-[var(--hud-muted)]">{t("damageDice", { dice: state.diceSlots.map((sides) => `d${sides}`).join(" + ") })}</div>}
      <div className="mt-1 text-sm text-[var(--hud-muted)]">{momentum ? t("momentum.held", { side: t("momentum.side") }) : t("momentum.none")}</div>
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
