/**
 * Компонент для бойових параметрів персонажа
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CharacterFormData } from "@/lib/api/characters";

interface CharacterCombatParamsProps {
  formData: CharacterFormData;
  onUpdate: <K extends keyof CharacterFormData>(
    field: K,
    value: CharacterFormData[K]
  ) => void;
}

export function CharacterCombatParams({
  formData,
  onUpdate,
}: CharacterCombatParamsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      <div className="w-full min-w-0">
        <Label htmlFor="armorClass">Клас Броні (AC)</Label>
        <Input
          id="armorClass"
          type="number"
          min="0"
          value={formData.armorClass}
          onChange={(e) => onUpdate("armorClass", parseInt(e.target.value) || 10)}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="initiative">Ініціатива</Label>
        <Input
          id="initiative"
          type="number"
          value={formData.initiative}
          onChange={(e) => onUpdate("initiative", parseInt(e.target.value) || 0)}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="speed">Швидкість</Label>
        <Input
          id="speed"
          type="number"
          min="0"
          value={formData.speed}
          onChange={(e) => onUpdate("speed", parseInt(e.target.value) || 30)}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="hitDice">Кістки Здоров'я</Label>
        <Input
          id="hitDice"
          value={formData.hitDice}
          onChange={(e) => onUpdate("hitDice", e.target.value)}
          placeholder="1d8"
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="maxHp">Макс. HP</Label>
        <Input
          id="maxHp"
          type="number"
          min="1"
          value={formData.maxHp}
          onChange={(e) => onUpdate("maxHp", parseInt(e.target.value) || 10)}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="currentHp">Поточне HP</Label>
        <Input
          id="currentHp"
          type="number"
          min="0"
          value={formData.currentHp}
          onChange={(e) => onUpdate("currentHp", parseInt(e.target.value) || 10)}
          className="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label htmlFor="tempHp">Тимчасове HP</Label>
        <Input
          id="tempHp"
          type="number"
          min="0"
          value={formData.tempHp}
          onChange={(e) => onUpdate("tempHp", parseInt(e.target.value) || 0)}
          className="w-full"
        />
      </div>
    </div>
  );
}
