import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Unit } from "@/types/units";

interface UnitAbilityScoresProps {
  formData: Partial<Unit>;
  onChange: (data: Partial<Unit>) => void;
}

export function UnitAbilityScores({
  formData,
  onChange,
}: UnitAbilityScoresProps) {
  const abilities = [
    { key: "strength", label: "Сила" },
    { key: "dexterity", label: "Спритність" },
    { key: "constitution", label: "Тіло" },
    { key: "intelligence", label: "Інтелект" },
    { key: "wisdom", label: "Мудрість" },
    { key: "charisma", label: "Харизма" },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {abilities.map((ability) => (
        <div key={ability.key}>
          <Label htmlFor={ability.key}>{ability.label}</Label>
          <Input
            id={ability.key}
            type="number"
            min="1"
            max="30"
            value={formData[ability.key] || 10}
            onChange={(e) =>
              onChange({
                [ability.key]: parseInt(e.target.value) || 10,
              } as Partial<Unit>)
            }
          />
        </div>
      ))}
    </div>
  );
}
