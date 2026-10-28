import { useState } from "react";

import { ClassLevelUpDialog } from "./ClassLevelUpDialog";

import { Button } from "@/components/ui/button";
import type { Character } from "@/types/characters";
import type { CharacterClassEntry } from "@/types/classes";

interface LevelUpActionProps {
  level: number;
  maxLevel: number;
  onLevelUp: () => void;
  classLevelUp?: { character: { campaignId: string; id: string; entries: CharacterClassEntry[] }; onLeveled: (updated: Character) => void };
}

export function LevelUpAction({ level, maxLevel, onLevelUp, classLevelUp }: LevelUpActionProps) {
  const [open, setOpen] = useState(false);

  if (level >= maxLevel) return null;

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={classLevelUp ? () => setOpen(true) : onLevelUp}>
        + рівень
      </Button>
      {classLevelUp && open && <ClassLevelUpDialog open onOpenChange={setOpen} {...classLevelUp} />}
    </>
  );
}
