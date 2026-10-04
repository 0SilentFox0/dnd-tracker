"use client";

import { Label } from "@/components/ui/label";
import type { BattleParticipant } from "@/types/battle";

interface SpellTargetsSectionProps {
  targetSelectionKind: "none" | "single" | "multi";
  selectedTargets: string[];
  availableTargets: BattleParticipant[];
  isDM: boolean;
  canSeeEnemyHp: boolean;
  onTargetToggle: (targetId: string, checked: boolean) => void;
}

export function SpellTargetsSection({
  targetSelectionKind,
  selectedTargets,
  availableTargets,
  isDM,
  canSeeEnemyHp,
  onTargetToggle,
}: SpellTargetsSectionProps) {
  if (targetSelectionKind === "none") return null;

  return (
    <div>
      <Label>
        Цілі
        {targetSelectionKind === "single"
          ? " (1 ціль)"
          : " (AOE — кілька)"}
      </Label>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {availableTargets.map((target) => (
          <label
            key={target.basicInfo.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-muted/50"
          >
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0"
              checked={selectedTargets.includes(target.basicInfo.id)}
              onChange={(e) =>
                onTargetToggle(target.basicInfo.id, e.target.checked)
              }
            />
            <span className="flex-1 text-sm">
              {target.basicInfo.name}
              {(isDM ||
                canSeeEnemyHp ||
                target.basicInfo.side === "ally") && (
                <span className="text-muted-foreground ml-2">
                  (HP: {target.combatStats.currentHp}/{target.combatStats.maxHp}
                  )
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
