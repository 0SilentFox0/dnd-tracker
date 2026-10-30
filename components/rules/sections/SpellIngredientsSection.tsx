import { useTranslations } from "next-intl";

import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function SpellIngredientsSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const section = form.data.spellIngredients;

  return (
    <RulesSection mechanic="spellIngredients">
      <SwitchField id="rules-spell-ingredients-enabled" label={t("sections.spellIngredients.enabled")} checked={section.enabled} onCheckedChange={(enabled) => form.set("spellIngredients", { ...section, enabled })} />
      <SwitchField id="rules-spell-ingredients-auto-pay" label={t("sections.spellIngredients.autoPay")} checked={section.autoPay} disabled={!section.enabled} onCheckedChange={(autoPay) => form.set("spellIngredients", { ...section, autoPay })} />
    </RulesSection>
  );
}
