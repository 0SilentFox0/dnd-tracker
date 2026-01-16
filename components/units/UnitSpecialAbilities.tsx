import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Spell } from "@/lib/api/spells";
import { UnitSpecialAbility, type SpecialAbility } from "./UnitSpecialAbility";

interface UnitSpecialAbilitiesProps {
  formData: {
    specialAbilities?: SpecialAbility[];
  };
  spells: Spell[];
  onChange: (abilities: SpecialAbility[]) => void;
}

export function UnitSpecialAbilities({
  formData,
  spells,
  onChange,
}: UnitSpecialAbilitiesProps) {
  const abilities = formData.specialAbilities || [];

  const handleAdd = () => {
    onChange([
      ...abilities,
      {
        name: "",
        description: "",
        type: "passive",
      },
    ]);
  };

  const handleChange = (index: number, ability: SpecialAbility) => {
    const updated = [...abilities];
    updated[index] = ability;
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = abilities.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Здібності</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          + Додати здібність
        </Button>
      </div>

      {abilities.length > 0 && (
        <div className="space-y-3">
          {abilities.map((ability, index) => (
            <UnitSpecialAbility
              key={index}
              ability={ability}
              index={index}
              spells={spells}
              onChange={(updated) => handleChange(index, updated)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </div>
      )}

      {abilities.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Немає доданих здібностей. Натисніть &quot;Додати здібність&quot; щоб додати
          нову.
        </p>
      )}
    </div>
  );
}
