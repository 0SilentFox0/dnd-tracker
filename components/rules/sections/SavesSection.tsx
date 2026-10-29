import { useTranslations } from "next-intl";

import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function SavesSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const saves = form.data.saves;

  return (
    <RulesSection mechanic="saves">
      <SwitchField id="rules-saves-proficiency" label={t("sections.saves.proficiency")} checked={saves.proficiency} onCheckedChange={(v) => form.set("saves", { ...saves, proficiency: v })} />
    </RulesSection>
  );
}
