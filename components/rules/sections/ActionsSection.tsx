import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ActionsSection({ form }: { form: RulesFormState }) {
  const actions = form.data.actions;

  return (
    <RulesSection mechanic="actions">
      <div className="space-y-3">
        <SwitchField id="rules-actions-enabled" label="Дії 5e увімкнені" checked={actions.enabled} onCheckedChange={(v) => form.set("actions", { ...actions, enabled: v })} />
        {actions.enabled && (
          <>
            <SwitchField id="rules-actions-oa" label="Атаки при відході" checked={actions.opportunityAttacks} onCheckedChange={(v) => form.set("actions", { ...actions, opportunityAttacks: v })} />
            <SwitchField id="rules-actions-variant" label="Правила 2024 (інакше 2014)" checked={actions.variant === "2024"} onCheckedChange={(v) => form.set("actions", { ...actions, variant: v ? "2024" : "2014" })} />
          </>
        )}
      </div>
    </RulesSection>
  );
}
