import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import type { RulesFormState } from "@/lib/hooks/campaigns";
import { proficiencyForLevel } from "@/lib/utils/rules";

export function FormulasSection({ form }: { form: RulesFormState }) {
  const f = form.data.formulas;

  const set = (patch: Partial<typeof f>) => form.set("formulas", { ...f, ...patch });

  return (
    <RulesSection mechanic="formulas">
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label="База DC" value={f.saveDcBase} range={[0, 20]} onCommit={(saveDcBase) => set({ saveDcBase })} />
        <NumberField label="Майстерність на 1 рівні" value={f.proficiencyBase} range={[0, 10]} onCommit={(proficiencyBase) => set({ proficiencyBase })} />
        <NumberField label="+1 кожні N рівнів" value={f.proficiencyEvery} range={[1, 20]} onCommit={(proficiencyEvery) => set({ proficiencyEvery })} />
      </div>
      <p className="mt-3 text-xs text-hud-muted">Рівень 5: майстерність {proficiencyForLevel(5, f)}, DC = база + {proficiencyForLevel(5, f)} + мод</p>
    </RulesSection>
  );
}
