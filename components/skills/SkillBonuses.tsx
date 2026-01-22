"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ABILITY_SCORES } from "@/lib/constants/abilities";

interface SkillBonusesProps {
  bonuses: {
    bonuses: Record<string, number>;
    handlers: {
      handleBonusChange: (attr: string, value: string) => void;
    };
  };
}

export function SkillBonuses({ bonuses: bonusesGroup }: SkillBonusesProps) {
  const { bonuses, handlers } = bonusesGroup;
  return (
    <div className="rounded-md border p-4 space-y-3">
      <p className="text-sm font-semibold">Бонуси до характеристик</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ABILITY_SCORES.map((attr) => (
          <div key={attr.key} className="space-y-1">
            <Label htmlFor={`bonus-${attr.key}`} className="text-xs">
              {attr.label}
            </Label>
            <Input
              id={`bonus-${attr.key}`}
              type="number"
              value={bonuses[attr.key] || ""}
              onChange={(e) =>
                handlers.handleBonusChange(attr.key, e.target.value)
              }
              placeholder="0"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
