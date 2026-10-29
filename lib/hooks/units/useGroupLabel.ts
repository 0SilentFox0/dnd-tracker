"use client";

import { useTranslator } from "@/lib/i18n/use-translator";
import { creatureTypeOfGroup, type UnitRaceGroup } from "@/lib/utils/units/group-units";

export function useGroupLabel() {

  const tg = useTranslator("gameTerms");

  return (group: Pick<UnitRaceGroup, "key" | "label">): string => {
    const type = creatureTypeOfGroup(group.key);

    return type && tg.has(`creatureTypes.${type}`) ? tg(`creatureTypes.${type}`) : group.label;
  };
}
