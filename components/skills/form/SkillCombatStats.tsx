"use client";

import { LabeledInput } from "@/components/ui/labeled-input";

interface SkillCombatStatsProps {
  combatStats: {
    damage: string;
    armor: string;
    speed: string;
    physicalResistance: string;
    magicalResistance: string;
    setters: {
      setDamage: (value: string) => void;
      setArmor: (value: string) => void;
      setSpeed: (value: string) => void;
      setPhysicalResistance: (value: string) => void;
      setMagicalResistance: (value: string) => void;
    };
  };
}

export function SkillCombatStats({
  combatStats,
}: SkillCombatStatsProps) {
  const { damage, armor, speed, physicalResistance, magicalResistance, setters } = combatStats;

  return (
    <div className="rounded-md border p-4 space-y-3">
      <p className="text-sm font-semibold">Бойові характеристики</p>
      <div className="grid gap-4 md:grid-cols-2">
        <LabeledInput
          id="skill-damage"
          label="Шкода"
          type="number"
          value={damage}
          onChange={(e) => setters.setDamage(e.target.value)}
          placeholder="0"
        />
        <LabeledInput
          id="skill-armor"
          label="Броня"
          type="number"
          value={armor}
          onChange={(e) => setters.setArmor(e.target.value)}
          placeholder="0"
        />
        <LabeledInput
          id="skill-speed"
          label="Швидкість"
          type="number"
          value={speed}
          onChange={(e) => setters.setSpeed(e.target.value)}
          placeholder="0"
        />
        <LabeledInput
          id="skill-physical-resistance"
          label="Резист фізичний"
          type="number"
          value={physicalResistance}
          onChange={(e) => setters.setPhysicalResistance(e.target.value)}
          placeholder="0"
        />
        <LabeledInput
          id="skill-magical-resistance"
          label="Резист магічний"
          type="number"
          value={magicalResistance}
          onChange={(e) => setters.setMagicalResistance(e.target.value)}
          placeholder="0"
        />
      </div>
    </div>
  );
}
