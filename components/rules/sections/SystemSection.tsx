import { useTranslations } from "next-intl";

import { HudSection } from "@/components/hud/form";
import { SelectField } from "@/components/ui/select-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { RULE_SYSTEM_KEYS } from "@/lib/utils/rules/systems/meta";

export function SystemSection({ form, locked }: { form: RulesFormState; locked: boolean }) {
  const t = useTranslations("rules");

  const tTerms = useTranslations("gameTerms");

  return (
    <HudSection title={t("system.label")}>
      <p className="mb-3 text-sm text-hud-muted">{t("system.description")}</p>
      <SelectField
        id="rules-system-key"
        aria-label={t("system.label")}
        value={form.data.system.key}
        onValueChange={(key) => form.set("system", { key })}
        options={RULE_SYSTEM_KEYS.map((key) => ({ value: key, label: tTerms(`ruleSystem.${key}` as never) }))}
        disabled={locked}
      />
      {locked && <p className="mt-2 text-xs text-hud-muted">{t("system.lockedHint")}</p>}
    </HudSection>
  );
}
