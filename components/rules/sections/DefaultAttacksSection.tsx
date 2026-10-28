import { RulesSection } from "../RulesSection";

import { LabeledInput } from "@/components/ui/labeled-input";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function DefaultAttacksSection({ form }: { form: RulesFormState }) {
  const a = form.data.defaultAttacks;

  return (
    <RulesSection mechanic="defaultAttacks">
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledInput label="Ближня атака" maxLength={60} value={a.meleeName} onChange={(e) => form.set("defaultAttacks", { ...a, meleeName: e.target.value })} />
        <LabeledInput label="Дальня атака" maxLength={60} value={a.rangedName} onChange={(e) => form.set("defaultAttacks", { ...a, rangedName: e.target.value })} />
      </div>
    </RulesSection>
  );
}
