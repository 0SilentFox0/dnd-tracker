"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BattleParticipant } from "@/types/battle";

interface SpellSavingThrowsSectionProps {
  selectedTargetIds: string[];
  availableTargets: BattleParticipant[];
  ability: string;
  values: Record<string, { roll: number; ability: string }>;
  onChange: (
    targetId: string,
    roll: number,
    ability: string,
  ) => void;
}

export function SpellSavingThrowsSection({
  selectedTargetIds,
  availableTargets,
  ability,
  values,
  onChange,
}: SpellSavingThrowsSectionProps) {
  if (selectedTargetIds.length === 0) return null;

  return (
    <div>
      <Label>Saving Throws ({ability.toUpperCase()})</Label>
      <div className="space-y-2">
        {selectedTargetIds.map((targetId) => {
          const target = availableTargets.find(
            (t) => t.basicInfo.id === targetId,
          );

          if (!target) return null;

          return (
            <div key={targetId} className="space-y-1">
              <Label className="text-xs">{target.basicInfo.name}</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={values[targetId]?.roll ?? ""}
                onChange={(e) =>
                  onChange(
                    targetId,
                    parseInt(e.target.value, 10) || 0,
                    ability,
                  )
                }
                placeholder="1d20"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
