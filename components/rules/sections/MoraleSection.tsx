import { useTranslations } from "next-intl";

import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function MoraleSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const morale = form.data.morale;

  return (
    <RulesSection mechanic="morale">
      <SwitchField id="rules-morale-enabled" label={t("sections.morale.enabled")} checked={morale.enabled} onCheckedChange={(enabled) => form.set("morale", { ...morale, enabled })} />
      <NumberField label={t("sections.morale.cap")} value={morale.cap} range={[1, 10]} disabled={!morale.enabled} onCommit={(cap) => form.set("morale", { ...morale, cap })} />
    </RulesSection>
  );
}
