import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function SavesSection({ form }: { form: RulesFormState }) {
  const saves = form.data.saves;

  return (
    <RulesSection mechanic="saves">
      <SwitchField id="rules-saves-proficiency" label="Майстерність у рятівних кидках" checked={saves.proficiency} onCheckedChange={(v) => form.set("saves", { ...saves, proficiency: v })} />
    </RulesSection>
  );
}
