"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UnitAttack, type UnitAttackItem } from "@/components/units/form/UnitAttack";
import type { Unit } from "@/types/units";

interface UnitAttacksProps {
  formData: Partial<Unit>;
  onChange: (data: Partial<Unit>) => void;
}

const defaultAttack: UnitAttackItem = {
  name: "",
  attackBonus: 0,
  damageDice: "1d6",
  damageType: "bludgeoning",
};

export function UnitAttacks({ formData, onChange }: UnitAttacksProps) {
  const attacks: UnitAttackItem[] = Array.isArray(formData.attacks)
    ? formData.attacks
    : [];

  const handleAdd = () => {
    onChange({
      attacks: [
        ...attacks,
        { ...defaultAttack, damageType: "bludgeoning" },
      ],
    });
  };

  const handleChange = (index: number, attack: UnitAttackItem) => {
    const updated = [...attacks];

    updated[index] = attack;
    onChange({ attacks: updated });
  };

  const handleRemove = (index: number) => {
    const updated = attacks.filter((_, i) => i !== index);

    onChange({ attacks: updated });
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Атаки (шкода)</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          + Додати атаку
        </Button>
      </div>

      {attacks.length > 0 ? (
        <div className="space-y-3">
          {attacks.map((attack, index) => (
            <UnitAttack
              key={index}
              attack={attack}
              index={index}
              onChange={(updated) => handleChange(index, updated)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">
          Немає доданих атак. Натисніть &quot;Додати атаку&quot; щоб вказати урон (назва, кубики шкоди, тип шкоди тощо).
        </p>
      )}
    </div>
  );
}
