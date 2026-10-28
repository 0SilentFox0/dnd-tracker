import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ConditionsSection({ form }: { form: RulesFormState }) {
  const conditions = form.data.conditions;

  return (
    <RulesSection mechanic="conditions">
      <SwitchField id="rules-conditions-enabled" label="Увімкнені" checked={conditions.enabled} onCheckedChange={(v) => form.set("conditions", { ...conditions, enabled: v })} />
      <SwitchField id="rules-conditions-exhaustion" label="Виснаження за правилами 2024 (інакше 2014)" checked={conditions.exhaustion === "2024"} onCheckedChange={(v) => form.set("conditions", { ...conditions, exhaustion: v ? "2024" : "2014" })} />
    </RulesSection>
  );
}
