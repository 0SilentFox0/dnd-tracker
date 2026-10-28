import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ItemsSection({ form }: { form: RulesFormState }) {
  const items = form.data.items;

  return (
    <RulesSection mechanic="items">
      <SwitchField id="rules-items-enabled" label="Предмети 5e: налаштування, носіння зі сховища, витратні в бою" checked={items.enabled} onCheckedChange={(enabled) => form.set("items", { ...items, enabled })} />
      <NumberField label="Ліміт налаштування" value={items.attunementLimit} range={[1, 10]} disabled={!items.enabled} onCommit={(attunementLimit) => form.set("items", { ...items, attunementLimit })} />
    </RulesSection>
  );
}
