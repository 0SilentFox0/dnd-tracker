import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ClassesSection({ form }: { form: RulesFormState }) {
  const classes = form.data.classes;

  return (
    <RulesSection mechanic="classes">
      <SwitchField id="rules-classes-enabled" label="Увімкнути класи 5e" checked={classes.enabled} onCheckedChange={(v) => form.set("classes", { ...classes, enabled: v })} />
    </RulesSection>
  );
}
