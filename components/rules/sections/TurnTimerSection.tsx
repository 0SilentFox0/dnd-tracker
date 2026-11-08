import { useTranslations } from "next-intl";

import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function TurnTimerSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const section = form.data.turnTimer;

  return (
    <RulesSection mechanic="turnTimer">
      <SwitchField id="rules-turn-timer-enabled" label={t("sections.turnTimer.enabled")} checked={section.enabled} onCheckedChange={(enabled) => form.set("turnTimer", { ...section, enabled })} />
      <NumberField label={t("sections.turnTimer.seconds")} value={section.seconds} range={[10, 600]} disabled={!section.enabled} onCommit={(seconds) => form.set("turnTimer", { ...section, seconds })} />
    </RulesSection>
  );
}
