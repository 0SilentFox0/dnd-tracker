import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <Select
        value={formData.damageModifier || "none"}
        onValueChange={(value) =>
          onChange({ damageModifier: value === "none" ? null : value })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Без модифікатора" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Без модифікатора</SelectItem>
          {DAMAGE_ELEMENT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
