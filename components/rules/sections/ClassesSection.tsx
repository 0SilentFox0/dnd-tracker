import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ClassesSection({ form }: { form: RulesFormState }) {
  const classes = form.data.classes;

  return (
    <RulesSection mechanic="classes">
      <div className="flex items-center gap-3">
        <Switch id="rules-classes-enabled" checked={classes.enabled} onCheckedChange={(v) => form.set("classes", { ...classes, enabled: v })} />
        <Label htmlFor="rules-classes-enabled">Увімкнути класи 5e</Label>
      </div>
    </RulesSection>
  );
}
