import { NumberField } from "../NumberField";

import { HudSection } from "@/components/hud/form";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { MECHANIC_REGISTRY, proficiencyForLevel } from "@/lib/utils/rules";

export function FormulasSection({ form }: { form: RulesFormState }) {
  const f = form.data.formulas;

  const set = (patch: Partial<typeof f>) => form.set("formulas", { ...f, ...patch });

  return (
    <HudSection title={MECHANIC_REGISTRY.formulas.label}>
      <p className="mb-3 text-sm text-hud-muted">{MECHANIC_REGISTRY.formulas.description}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label="База DC" value={f.saveDcBase} range={[0, 20]} onCommit={(saveDcBase) => set({ saveDcBase })} />
        <NumberField label="Майстерність на 1 рівні" value={f.proficiencyBase} range={[0, 10]} onCommit={(proficiencyBase) => set({ proficiencyBase })} />
        <NumberField label="+1 кожні N рівнів" value={f.proficiencyEvery} range={[1, 20]} onCommit={(proficiencyEvery) => set({ proficiencyEvery })} />
      </div>
      <p className="mt-3 text-xs text-hud-muted">Рівень 5: майстерність {proficiencyForLevel(5, f)}, DC = база + {proficiencyForLevel(5, f)} + мод</p>
    </HudSection>
  );
}
