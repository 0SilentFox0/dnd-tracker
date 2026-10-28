import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ConditionsSection({ form }: { form: RulesFormState }) {
  const conditions = form.data.conditions;

  return (
    <RulesSection mechanic="conditions">
      <div className="flex items-center gap-3">
        <Switch id="rules-conditions-enabled" checked={conditions.enabled} onCheckedChange={(v) => form.set("conditions", { ...conditions, enabled: v })} />
        <Label htmlFor="rules-conditions-enabled">Увімкнені</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="rules-conditions-exhaustion" checked={conditions.exhaustion === "2024"} onCheckedChange={(v) => form.set("conditions", { ...conditions, exhaustion: v ? "2024" : "2014" })} />
        <Label htmlFor="rules-conditions-exhaustion">Виснаження за правилами 2024 (інакше 2014)</Label>
      </div>
    </RulesSection>
  );
}
