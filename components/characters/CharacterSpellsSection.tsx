/**
 * Компонент для заклинань персонажа
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SPELLCASTING_ABILITIES } from "@/lib/constants";
import { CharacterFormData } from "@/lib/api/characters";

interface CharacterSpellsSectionProps {
  formData: CharacterFormData;
  onUpdate: <K extends keyof CharacterFormData>(
    field: K,
    value: CharacterFormData[K]
  ) => void;
  onAddSpell: (spellId: string) => void;
  onRemoveSpell: (index: number) => void;
}

export function CharacterSpellsSection({
  formData,
  onUpdate,
  onAddSpell,
  onRemoveSpell,
}: CharacterSpellsSectionProps) {
  const handleSpellInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const spellId = (e.target as HTMLInputElement).value.trim();
      if (spellId && !formData.knownSpells.includes(spellId)) {
        onAddSpell(spellId);
        (e.target as HTMLInputElement).value = "";
      }
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="w-full min-w-0">
        <Label htmlFor="spellcastingClass">Клас заклинателя</Label>
        <Input
          id="spellcastingClass"
          value={formData.spellcastingClass || ""}
          onChange={(e) => onUpdate("spellcastingClass", e.target.value)}
          placeholder="Наприклад: Чарівник"
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="spellcastingAbility">Характеристика заклинань</Label>
        <Select
          value={formData.spellcastingAbility || ""}
          onValueChange={(value: "intelligence" | "wisdom" | "charisma") =>
            onUpdate("spellcastingAbility", value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Виберіть характеристику" />
          </SelectTrigger>
          <SelectContent>
            {SPELLCASTING_ABILITIES.map((ability) => (
              <SelectItem key={ability.value} value={ability.value}>
                {ability.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-0">
        <Label>Відомі заклинання (ID)</Label>
        <div className="flex gap-2 w-full">
          <Input
            placeholder="Введіть ID заклинання"
            className="w-full"
            onKeyPress={handleSpellInputKeyPress}
          />
        </div>
        {formData.knownSpells.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.knownSpells.map((spellId, index) => (
              <span
                key={index}
                className="bg-muted px-2 py-1 rounded text-sm flex items-center gap-1"
              >
                {spellId}
                <button
                  type="button"
                  onClick={() => onRemoveSpell(index)}
                  className="text-destructive hover:underline"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
