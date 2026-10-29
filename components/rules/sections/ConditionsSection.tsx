import { useTranslations } from "next-intl";

import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ConditionsSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const conditions = form.data.conditions;

  return (
    <RulesSection mechanic="conditions">
      <SwitchField id="rules-conditions-enabled" label={t("sections.conditions.enabled")} checked={conditions.enabled} onCheckedChange={(v) => form.set("conditions", { ...conditions, enabled: v })} />
      <SwitchField id="rules-conditions-exhaustion" label={t("sections.conditions.exhaustion")} checked={conditions.exhaustion === "2024"} onCheckedChange={(v) => form.set("conditions", { ...conditions, exhaustion: v ? "2024" : "2014" })} />
    </RulesSection>
  );
}
