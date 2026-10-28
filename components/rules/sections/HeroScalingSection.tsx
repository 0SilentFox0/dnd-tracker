import { DiceTableEditor } from "../DiceTableEditor";
import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { AttackType } from "@/lib/constants/battle";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function HeroScalingSection({ form }: { form: RulesFormState }) {
  const h = form.data.heroScaling;

  const set = (patch: Partial<typeof h>) => form.set("heroScaling", { ...h, ...patch });

  return (
    <RulesSection mechanic="heroScaling">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Базових рівнів HP" value={h.hpBaseLevels} range={[0, 10]} onCommit={(hpBaseLevels) => set({ hpBaseLevels })} />
        <NumberField label="Коефіцієнт CON" value={h.hpConCoefficient} range={[0, 5]} decimal onCommit={(hpConCoefficient) => set({ hpConCoefficient })} />
      </div>
      <div className="mt-4 space-y-5">
        <DiceTableEditor title="Ближня атака" type={AttackType.MELEE} table={h.meleeDiceByLevel} onChange={(meleeDiceByLevel) => set({ meleeDiceByLevel })} />
        <DiceTableEditor title="Дальня атака" type={AttackType.RANGED} table={h.rangedDiceByLevel} onChange={(rangedDiceByLevel) => set({ rangedDiceByLevel })} />
      </div>
    </RulesSection>
  );
}
