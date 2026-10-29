import { useTranslations } from "next-intl";

import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import type { RulesFormState } from "@/lib/hooks/campaigns";
import { proficiencyForLevel } from "@/lib/utils/rules";

export function FormulasSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const f = form.data.formulas;

  const set = (patch: Partial<typeof f>) => form.set("formulas", { ...f, ...patch });

  return (
    <RulesSection mechanic="formulas">
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label={t("sections.formulas.saveDcBase")} value={f.saveDcBase} range={[0, 20]} onCommit={(saveDcBase) => set({ saveDcBase })} />
        <NumberField label={t("sections.formulas.proficiencyBase")} value={f.proficiencyBase} range={[0, 10]} onCommit={(proficiencyBase) => set({ proficiencyBase })} />
        <NumberField label={t("sections.formulas.proficiencyEvery")} value={f.proficiencyEvery} range={[1, 20]} onCommit={(proficiencyEvery) => set({ proficiencyEvery })} />
      </div>
      <p className="mt-3 text-xs text-hud-muted">{t("sections.formulas.preview", { proficiency: proficiencyForLevel(5, f) })}</p>
    </RulesSection>
  );
}
