/**
 * Компонент для характеристик персонажа
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ABILITY_SCORES } from "@/lib/constants";
import { CharacterFormData } from "@/lib/api/characters";

interface CharacterAbilityScoresProps {
  formData: CharacterFormData;
  onUpdate: <K extends keyof CharacterFormData>(
    field: K,
    value: CharacterFormData[K]
  ) => void;
}

export function CharacterAbilityScores({
  formData,
  onUpdate,
}: CharacterAbilityScoresProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
      {ABILITY_SCORES.map(({ key, label }) => (
        <div key={key} className="w-full min-w-0">
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            type="number"
            min="1"
            max="30"
            value={formData[key as keyof CharacterFormData] as number}
            onChange={(e) =>
              onUpdate(key as keyof CharacterFormData, parseInt(e.target.value) || 10)
            }
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
}
