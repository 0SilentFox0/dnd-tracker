"use client";

import { useTranslations } from "next-intl";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Label } from "@/components/ui/label";
import { MAZE_LIMITS } from "@/lib/constants/battle";

export interface MazeCounts {
  teleportPairs: number;
  fogPatches: number;
}

export const DEFAULT_MAZE_COUNTS: MazeCounts = { teleportPairs: 1, fogPatches: 2 };

export function MazeCountsFields({ value, onChange }: { value: MazeCounts; onChange: (next: MazeCounts) => void }) {
  const t = useTranslations("battleDm.maze.counts");

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="maze-teleports">{t("teleportPairs")}</Label>
        <BoundedNumberInput id="maze-teleports" value={value.teleportPairs} min={0} max={MAZE_LIMITS.teleportPairs} onCommit={(teleportPairs) => onChange({ ...value, teleportPairs })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maze-fog">{t("fogPatches")}</Label>
        <BoundedNumberInput id="maze-fog" value={value.fogPatches} min={0} max={MAZE_LIMITS.fogPatches} onCommit={(fogPatches) => onChange({ ...value, fogPatches })} />
      </div>
    </div>
  );
}
