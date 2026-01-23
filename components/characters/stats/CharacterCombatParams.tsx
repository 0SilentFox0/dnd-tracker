/**
 * Компонент для бойових параметрів персонажа
 */

import { LabeledInput } from "@/components/ui/labeled-input";

interface CharacterCombatParamsProps {
  combatStats: {
    armorClass: number;
    initiative: number;
    speed: number;
    maxHp: number;
    currentHp: number;
    tempHp: number;
    hitDice: string;
    setters: {
      setArmorClass: (value: number) => void;
      setInitiative: (value: number) => void;
      setSpeed: (value: number) => void;
      setMaxHp: (value: number) => void;
      setCurrentHp: (value: number) => void;
      setTempHp: (value: number) => void;
      setHitDice: (value: string) => void;
    };
  };
}

export function CharacterCombatParams({
  combatStats,
}: CharacterCombatParamsProps) {
  const { armorClass, initiative, speed, maxHp, currentHp, tempHp, hitDice, setters } = combatStats;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      <LabeledInput
        id="armorClass"
        label="Клас Броні (AC)"
        type="number"
        min="0"
        value={armorClass}
        onChange={(e) => setters.setArmorClass(parseInt(e.target.value) || 10)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="initiative"
        label="Ініціатива"
        type="number"
        value={initiative}
        onChange={(e) => setters.setInitiative(parseInt(e.target.value) || 0)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="speed"
        label="Швидкість"
        type="number"
        min="0"
        value={speed}
        onChange={(e) => setters.setSpeed(parseInt(e.target.value) || 30)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="hitDice"
        label="Кістки Здоров'я"
        value={hitDice}
        onChange={(e) => setters.setHitDice(e.target.value)}
        placeholder="1d8"
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="maxHp"
        label="Макс. HP"
        type="number"
        min="1"
        value={maxHp}
        onChange={(e) => setters.setMaxHp(parseInt(e.target.value) || 10)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="currentHp"
        label="Поточне HP"
        type="number"
        min="0"
        value={currentHp}
        onChange={(e) => setters.setCurrentHp(parseInt(e.target.value) || 10)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="tempHp"
        label="Тимчасове HP"
        type="number"
        min="0"
        value={tempHp}
        onChange={(e) => setters.setTempHp(parseInt(e.target.value) || 0)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
    </div>
  );
}
