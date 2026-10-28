import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ActionsSection({ form }: { form: RulesFormState }) {
  const actions = form.data.actions;

  return (
    <RulesSection mechanic="actions">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Switch id="rules-actions-enabled" checked={actions.enabled} onCheckedChange={(v) => form.set("actions", { ...actions, enabled: v })} />
          <Label htmlFor="rules-actions-enabled">Дії 5e увімкнені</Label>
        </div>
        {actions.enabled && (
          <>
            <div className="flex items-center gap-3">
              <Switch id="rules-actions-oa" checked={actions.opportunityAttacks} onCheckedChange={(v) => form.set("actions", { ...actions, opportunityAttacks: v })} />
              <Label htmlFor="rules-actions-oa">Атаки при відході</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="rules-actions-variant" checked={actions.variant === "2024"} onCheckedChange={(v) => form.set("actions", { ...actions, variant: v ? "2024" : "2014" })} />
              <Label htmlFor="rules-actions-variant">Правила 2024 (інакше 2014)</Label>
            </div>
          </>
        )}
      </div>
    </RulesSection>
  );
}
