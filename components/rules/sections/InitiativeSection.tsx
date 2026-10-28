import { NumberField } from "../NumberField";

import { HudSection } from "@/components/hud/form";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules";

export function InitiativeSection({ form }: { form: RulesFormState }) {
  const i = form.data.initiative;

  return (
    <HudSection title={MECHANIC_REGISTRY.initiative.label}>
      <p className="mb-3 text-sm text-hud-muted">{MECHANIC_REGISTRY.initiative.description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Мінімум" value={i.heroMin} range={[0, 50]} onCommit={(heroMin) => form.set("initiative", { ...i, heroMin })} />
        <NumberField label="Максимум" value={i.heroMax} range={[0, 50]} onCommit={(heroMax) => form.set("initiative", { ...i, heroMax })} />
      </div>
    </HudSection>
  );
}
