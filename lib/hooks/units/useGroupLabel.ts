"use client";

import { useTranslator } from "@/lib/i18n/use-translator";
import { creatureTypeOfGroup, NO_RACE, type UnitRaceGroup } from "@/lib/utils/units/group-units";

export function useGroupLabel() {

  const tg = useTranslator("gameTerms");

  return (group: Pick<UnitRaceGroup, "key" | "label">): string => {
    if (group.key === NO_RACE) return tg("ungrouped.race");

    const type = creatureTypeOfGroup(group.key);

    return type && tg.has(`creatureTypes.${type}`) ? tg(`creatureTypes.${type}`) : group.label;
  };
}
