import { useTranslations } from "next-intl";

import { D100RollPicker } from "./D100RollPicker";

import type { CastTestProps } from "@/components/systems/types";

export function CastTestBody({ book: { state, view, actions } }: CastTestProps) {
  const t = useTranslations("wfrpMagic.ui.cast");

  const { cast } = view;

  if (!cast) return null;

  const rolled = state.castServer ? t("rolledAuto") : state.castRoll === undefined ? null : state.castSecond === undefined ? t("rolled", { roll: state.castRoll }) : t("rolledReroll", { roll: state.castRoll, second: state.castSecond });

  return (
    <div className="mt-2">
      <div className="text-sm text-hud-gold">{t("line", { cn: cast.cn, target: cast.target, channelled: cast.channelled, armour: cast.armourSl })}</div>
      <D100RollPicker
        fortune={{ available: cast.fortune.available, left: cast.fortune.left, value: cast.fortune.value, onChange: actions.setCastFortune }}
        onRoll={actions.setCastRoll}
        onAuto={() => actions.setCastRoll()}
      />
      {rolled && <div role="status" className="mt-2 text-sm text-[var(--ink)]">{rolled}</div>}
    </div>
  );
}
