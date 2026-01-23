import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import type { Unit } from "@/types/units";

interface UnitDamageModifierProps {
  formData: Partial<Unit>;
  onChange: (data: Partial<Unit>) => void;
}

export function UnitDamageModifier({
  formData,
  onChange,
}: UnitDamageModifierProps) {
  return (
    <div>
      <Label>Модифікатор шкоди</Label>
      <SelectField
        value={formData.damageModifier || ""}
        onValueChange={(value) => onChange({ damageModifier: value || null })}
        placeholder="Без модифікатора"
        options={DAMAGE_ELEMENT_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
        allowNone
        noneLabel="Без модифікатора"
      />
    </div>
  );
}
