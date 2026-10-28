"use client";

import { useTranslator } from "@/lib/i18n/use-translator";
import { creatureTypeOfGroup, type UnitRaceGroup } from "@/lib/utils/units/group-units";

export function useGroupLabel() {
  const t = useTranslator("common");

  return (group: Pick<UnitRaceGroup, "key" | "label">): string => {
    const type = creatureTypeOfGroup(group.key);

    return type && t.has(`creatureTypes.${type}`) ? t(`creatureTypes.${type}`) : group.label;
  };
}
