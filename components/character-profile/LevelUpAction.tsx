import { type ComponentProps, useState } from "react";
import { useTranslations } from "next-intl";

import { ClassLevelUpDialog } from "./ClassLevelUpDialog";

import { Button } from "@/components/ui/button";
import type { Character } from "@/types/characters";

interface LevelUpActionProps {
  level: number;
  maxLevel: number;
  onLevelUp: () => void;
  classLevelUp?: { character: ComponentProps<typeof ClassLevelUpDialog>["character"]; onLeveled: (updated: Character) => void };
}

export function LevelUpAction({ level, maxLevel, onLevelUp, classLevelUp }: LevelUpActionProps) {
  const t = useTranslations("characterProfile.levelUp");

  const [open, setOpen] = useState(false);

  if (level >= maxLevel) return null;

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={classLevelUp ? () => setOpen(true) : onLevelUp}>
        {t("action")}
      </Button>
      {classLevelUp && open && <ClassLevelUpDialog open onOpenChange={setOpen} {...classLevelUp} />}
    </>
  );
}
