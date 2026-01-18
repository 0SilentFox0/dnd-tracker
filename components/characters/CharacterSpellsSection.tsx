/**
 * Компонент для Магічної Книги персонажа
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPELLCASTING_ABILITIES } from "@/lib/constants";
import { CharacterFormData } from "@/lib/api/characters";
import { SpellMultiSelect } from "./SpellMultiSelect";

interface CharacterSpellsSectionProps {
  formData: CharacterFormData;
  campaignId: string;
  onUpdate: <K extends keyof CharacterFormData>(
    field: K,
    value: CharacterFormData[K]
  ) => void;
  onAddSpell: (spellId: string) => void;
  onRemoveSpell: (index: number) => void;
}

export function CharacterSpellsSection({
  formData,
  campaignId,
  onUpdate,
  onAddSpell,
  onRemoveSpell,
}: CharacterSpellsSectionProps) {
  const handleSpellSelectionChange = (spellIds: string[]) => {
    onUpdate("knownSpells", spellIds);
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
        <Label>Стартові заклинання (Магічна Книга)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Оберіть заклинання, які персонаж знає на початку. Додаткові заклинання будуть автоматично додаватися при вивченні скілів.
        </p>
        <SpellMultiSelect
          campaignId={campaignId}
          selectedSpellIds={formData.knownSpells}
          onSelectionChange={handleSpellSelectionChange}
        />
      </div>
    </div>
  );
}
