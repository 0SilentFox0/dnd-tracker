import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import type { RulesFormState } from "@/lib/hooks/campaigns";

export function InitiativeSection({ form }: { form: RulesFormState }) {
  const i = form.data.initiative;

  return (
    <RulesSection mechanic="initiative">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Мінімум" value={i.heroMin} range={[0, 50]} onCommit={(heroMin) => form.set("initiative", { ...i, heroMin })} />
        <NumberField label="Максимум" value={i.heroMax} range={[0, 50]} onCommit={(heroMax) => form.set("initiative", { ...i, heroMax })} />
      </div>
    </RulesSection>
  );
}
