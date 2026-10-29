import { useTranslations } from "next-intl";

import { DiceTableEditor } from "../DiceTableEditor";
import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { AttackType } from "@/lib/constants/battle";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function HeroScalingSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const h = form.data.heroScaling;

  const set = (patch: Partial<typeof h>) => form.set("heroScaling", { ...h, ...patch });

  return (
    <RulesSection mechanic="heroScaling">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label={t("sections.heroScaling.hpBaseLevels")} value={h.hpBaseLevels} range={[0, 10]} onCommit={(hpBaseLevels) => set({ hpBaseLevels })} />
        <NumberField label={t("sections.heroScaling.hpConCoefficient")} value={h.hpConCoefficient} range={[0, 5]} decimal onCommit={(hpConCoefficient) => set({ hpConCoefficient })} />
      </div>
      <div className="mt-4 space-y-5">
        <DiceTableEditor title={t("sections.heroScaling.melee")} type={AttackType.MELEE} table={h.meleeDiceByLevel} onChange={(meleeDiceByLevel) => set({ meleeDiceByLevel })} />
        <DiceTableEditor title={t("sections.heroScaling.ranged")} type={AttackType.RANGED} table={h.rangedDiceByLevel} onChange={(rangedDiceByLevel) => set({ rangedDiceByLevel })} />
      </div>
    </RulesSection>
  );
}
