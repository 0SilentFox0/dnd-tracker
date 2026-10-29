import { useTranslations } from "next-intl";

import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { SelectField } from "@/components/ui/select-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function InitiativeSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const i = form.data.initiative;

  return (
    <RulesSection mechanic="initiative">
      <div className="mb-3 grid gap-1">
        <label htmlFor="rules-initiative-mode" className="text-sm">{t("sections.initiative.mode")}</label>
        <SelectField
          id="rules-initiative-mode"
          value={i.mode}
          onValueChange={(mode) => form.set("initiative", { ...i, mode: mode as typeof i.mode })}
          options={[
            { value: "static", label: t("sections.initiative.modeStatic") },
            { value: "roll", label: t("sections.initiative.modeRoll") },
          ]}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label={t("sections.initiative.min")} value={i.heroMin} range={[0, 50]} onCommit={(heroMin) => form.set("initiative", { ...i, heroMin })} />
        <NumberField label={t("sections.initiative.max")} value={i.heroMax} range={[0, 50]} onCommit={(heroMax) => form.set("initiative", { ...i, heroMax })} />
      </div>
    </RulesSection>
  );
}
