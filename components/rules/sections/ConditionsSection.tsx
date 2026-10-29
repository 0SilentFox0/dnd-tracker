import { useTranslations } from "next-intl";

import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { CONDITION_LABELS } from "@/lib/utils/abilities/registry/labels";

export function ConditionsSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const conditions = form.data.conditions;

  const custom = conditions.custom ?? [];

  return (
    <RulesSection mechanic="conditions">
      <SwitchField id="rules-conditions-enabled" label={t("sections.conditions.enabled")} checked={conditions.enabled} onCheckedChange={(v) => form.set("conditions", { ...conditions, enabled: v })} />
      <SwitchField id="rules-conditions-exhaustion" label={t("sections.conditions.exhaustion")} checked={conditions.exhaustion === "2024"} onCheckedChange={(v) => form.set("conditions", { ...conditions, exhaustion: v ? "2024" : "2014" })} />
      {custom.length > 0 && (
        <div className="mt-3 space-y-2" data-testid="custom-conditions">
          <h4 className="text-sm font-semibold">{t("sections.conditions.custom")}</h4>
          <ul className="space-y-2">
            {custom.map((c) => (
              <li key={c.key} className="rounded border border-hud-line/50 p-2 text-sm">
                <div className="font-medium">{c.name}</div>
                {c.description && <p className="text-hud-muted">{c.description}</p>}
                {c.markers.length > 0 && <p className="text-xs text-hud-muted">{c.markers.map((m) => CONDITION_LABELS[m]).join(", ")}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </RulesSection>
  );
}
