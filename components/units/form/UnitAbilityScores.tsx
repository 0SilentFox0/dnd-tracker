import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import type { Unit } from "@/types/units";

interface UnitAbilityScoresProps {
  formData: Partial<Unit>;
  onChange: (data: Partial<Unit>) => void;
}

export function UnitAbilityScores({ formData, onChange }: UnitAbilityScoresProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {CORE_ABILITY_SCORES.map((ability) => (
        <div key={ability.key}>
          <Label htmlFor={ability.key}>{ability.label}</Label>
          <NumberInput
            id={ability.key}
            value={formData[ability.key]}
            onChange={(value) => onChange({ [ability.key]: value } as Partial<Unit>)}
          />
        </div>
      ))}
    </div>
  );
}
