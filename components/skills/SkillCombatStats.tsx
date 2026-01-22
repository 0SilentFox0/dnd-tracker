"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
        <div className="space-y-2">
          <Label htmlFor="skill-damage">Шкода</Label>
          <Input
            id="skill-damage"
            type="number"
            value={damage}
            onChange={(e) => setters.setDamage(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="skill-armor">Броня</Label>
          <Input
            id="skill-armor"
            type="number"
            value={armor}
            onChange={(e) => setters.setArmor(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="skill-speed">Швидкість</Label>
          <Input
            id="skill-speed"
            type="number"
            value={speed}
            onChange={(e) => setters.setSpeed(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="skill-physical-resistance">Резист фізичний</Label>
          <Input
            id="skill-physical-resistance"
            type="number"
            value={physicalResistance}
            onChange={(e) => setters.setPhysicalResistance(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="skill-magical-resistance">Резист магічний</Label>
          <Input
            id="skill-magical-resistance"
            type="number"
            value={magicalResistance}
            onChange={(e) => setters.setMagicalResistance(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}
