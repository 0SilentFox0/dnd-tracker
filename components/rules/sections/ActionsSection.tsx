import { useTranslations } from "next-intl";

import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ActionsSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const actions = form.data.actions;

  return (
    <RulesSection mechanic="actions">
      <div className="space-y-3">
        <SwitchField id="rules-actions-enabled" label={t("sections.actions.enabled")} checked={actions.enabled} onCheckedChange={(v) => form.set("actions", { ...actions, enabled: v })} />
        {actions.enabled && (
          <>
            <SwitchField id="rules-actions-oa" label={t("sections.actions.opportunityAttacks")} checked={actions.opportunityAttacks} onCheckedChange={(v) => form.set("actions", { ...actions, opportunityAttacks: v })} />
            <SwitchField id="rules-actions-retaliation" label={t("sections.actions.retaliation")} checked={actions.retaliation} onCheckedChange={(v) => form.set("actions", { ...actions, retaliation: v })} />
            <SwitchField id="rules-actions-variant" label={t("sections.actions.variant")} checked={actions.variant === "2024"} onCheckedChange={(v) => form.set("actions", { ...actions, variant: v ? "2024" : "2014" })} />
          </>
        )}
      </div>
    </RulesSection>
  );
}
