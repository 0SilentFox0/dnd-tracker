import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { SelectField } from "@/components/ui/select-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function InitiativeSection({ form }: { form: RulesFormState }) {
  const i = form.data.initiative;

  return (
    <RulesSection mechanic="initiative">
      <div className="mb-3 grid gap-1">
        <label htmlFor="rules-initiative-mode" className="text-sm">Спосіб</label>
        <SelectField
          id="rules-initiative-mode"
          value={i.mode}
          onValueChange={(mode) => form.set("initiative", { ...i, mode: mode as typeof i.mode })}
          options={[
            { value: "static", label: "Статична (з листа / юніта)" },
            { value: "roll", label: "d20 + модифікатор Спритності при старті бою" },
          ]}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Мінімум" value={i.heroMin} range={[0, 50]} onCommit={(heroMin) => form.set("initiative", { ...i, heroMin })} />
        <NumberField label="Максимум" value={i.heroMax} range={[0, 50]} onCommit={(heroMax) => form.set("initiative", { ...i, heroMax })} />
      </div>
    </RulesSection>
  );
}
