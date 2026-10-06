"use client";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
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
    <HudSection
      title="Атаки (шкода)"
      className="space-y-4"
      action={
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          + Додати атаку
        </Button>
      }
    >
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
    </HudSection>
  );
}
