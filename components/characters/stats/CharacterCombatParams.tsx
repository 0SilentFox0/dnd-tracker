/**
 * Компонент для бойових параметрів персонажа
 */

import { LabeledInput } from "@/components/ui/labeled-input";

interface CharacterCombatParamsProps {
  combatStats: {
    armorClass: number;
    initiative: number;
    speed: number;
    hitDice: string;
    minTargets: number;
    maxTargets: number;
    morale: number;
    setters: {
      setArmorClass: (value: number) => void;
      setInitiative: (value: number) => void;
      setSpeed: (value: number) => void;
      setHitDice: (value: string) => void;
      setMinTargets: (value: number) => void;
      setMaxTargets: (value: number) => void;
      setMorale: (value: number) => void;
    };
  };
}

export function CharacterCombatParams({
  combatStats,
}: CharacterCombatParamsProps) {
  const {
    armorClass,
    initiative,
    speed,
    hitDice,
    minTargets,
    maxTargets,
    morale,
    setters,
  } = combatStats;

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
        id="minTargets"
        label="Мін. цілей"
        type="number"
        min="1"
        value={minTargets}
        onChange={(e) => setters.setMinTargets(parseInt(e.target.value) || 1)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="maxTargets"
        label="Макс. цілей"
        type="number"
        min="1"
        value={maxTargets}
        onChange={(e) => setters.setMaxTargets(parseInt(e.target.value) || 1)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <LabeledInput
        id="morale"
        label="Мораль"
        type="number"
        min="-3"
        max="3"
        value={morale}
        onChange={(e) => setters.setMorale(parseInt(e.target.value) || 0)}
        containerClassName="w-full min-w-0"
        className="w-full"
      />
    </div>
  );
}
