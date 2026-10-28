import type { Background } from "@prisma/client";

import { type DndSkill, isDndSkill } from "@/lib/constants/skills";
import { readChoices } from "@/lib/utils/characters/choices/read";
import type { BackgroundData } from "@/types/backgrounds";

export function toBackgroundData(row: Background): BackgroundData {
  return {
    id: row.id, name: row.name, icon: row.icon, description: row.description,
    choices: readChoices(row.choices),
    skillProficiencies: Array.isArray(row.skillProficiencies) ? row.skillProficiencies.filter((v): v is DndSkill => typeof v === "string" && isDndSkill(v)) : [],
    toolProficiencies: Array.isArray(row.toolProficiencies) ? row.toolProficiencies.filter((v): v is string => typeof v === "string") : [],
    originFeatId: row.originFeatId, equipmentText: row.equipmentText,
  };
}
