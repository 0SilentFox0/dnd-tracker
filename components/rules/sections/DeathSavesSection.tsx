import { useTranslations } from "next-intl";

import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function DeathSavesSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const deathSaves = form.data.deathSaves;

  return (
    <RulesSection mechanic="deathSaves">
      <div className="space-y-3">
      <SwitchField id="rules-death-saves-enabled" label={t("sections.deathSaves.enabled")} checked={deathSaves.enabled} onCheckedChange={(v) => form.set("deathSaves", { ...deathSaves, enabled: v })} />
      {deathSaves.enabled && (
        <SwitchField id="rules-death-saves-units" label={t("sections.deathSaves.unitsDieAtZero")} checked={deathSaves.unitsDieAtZero} onCheckedChange={(v) => form.set("deathSaves", { ...deathSaves, unitsDieAtZero: v })} />
      )}
      </div>
    </RulesSection>
  );
}
