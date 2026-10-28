import { useState } from "react";

import { DiceTableEditor } from "../DiceTableEditor";
import { NumberField } from "../NumberField";

import { HudSection } from "@/components/hud/form";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/labeled-input";
import { AttackType } from "@/lib/constants/battle";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules";

const CON_RANGE = { min: 0, max: 5 };

function CoefficientField({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const n = Number(draft);

    if (draft !== null && draft.trim() !== "" && Number.isFinite(n)) onCommit(Math.min(CON_RANGE.max, Math.max(CON_RANGE.min, n)));

    setDraft(null);
  };

  return (
    <FormField label="Коефіцієнт CON" htmlFor="rules-hp-con">
      <Input
        id="rules-hp-con"
        inputMode="decimal"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
      />
    </FormField>
  );
}

export function HeroScalingSection({ form }: { form: RulesFormState }) {
  const h = form.data.heroScaling;

  const set = (patch: Partial<typeof h>) => form.set("heroScaling", { ...h, ...patch });

  return (
    <HudSection title={MECHANIC_REGISTRY.heroScaling.label}>
      <p className="mb-3 text-sm text-hud-muted">{MECHANIC_REGISTRY.heroScaling.description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Базових рівнів HP" value={h.hpBaseLevels} range={[0, 10]} onCommit={(hpBaseLevels) => set({ hpBaseLevels })} />
        <CoefficientField value={h.hpConCoefficient} onCommit={(hpConCoefficient) => set({ hpConCoefficient })} />
      </div>
      <div className="mt-4 space-y-5">
        <DiceTableEditor title="Ближня атака" type={AttackType.MELEE} table={h.meleeDiceByLevel} onChange={(meleeDiceByLevel) => set({ meleeDiceByLevel })} />
        <DiceTableEditor title="Дальня атака" type={AttackType.RANGED} table={h.rangedDiceByLevel} onChange={(rangedDiceByLevel) => set({ rangedDiceByLevel })} />
      </div>
    </HudSection>
  );
}
