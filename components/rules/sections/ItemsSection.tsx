import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ItemsSection({ form }: { form: RulesFormState }) {
  const items = form.data.items;

  return (
    <RulesSection mechanic="items">
      <div className="flex items-center gap-3">
        <Switch id="rules-items-enabled" checked={items.enabled} onCheckedChange={(enabled) => form.set("items", { ...items, enabled })} />
        <Label htmlFor="rules-items-enabled">Предмети 5e: налаштування, носіння зі сховища, витратні в бою</Label>
      </div>
      <NumberField label="Ліміт налаштування" value={items.attunementLimit} range={[1, 10]} disabled={!items.enabled} onCommit={(attunementLimit) => form.set("items", { ...items, attunementLimit })} />
    </RulesSection>
  );
}
