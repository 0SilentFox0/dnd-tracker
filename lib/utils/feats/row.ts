import type { Feat } from "@prisma/client";

import { isAbilityKey } from "@/lib/constants/abilities";
import { FEAT_TYPES } from "@/lib/constants/choices";
import { featAbilities, readChoiceList } from "@/lib/utils/abilities/read";
import { isRecord } from "@/lib/utils/common/is-record";
import type { FeatData, FeatPrerequisite, FeatType } from "@/types/choices";

function prerequisiteOf(raw: unknown): FeatPrerequisite {
  if (!isRecord(raw)) return {};

  const out: FeatPrerequisite = {};

  if (typeof raw.level === "number") out.level = raw.level;

  if (isRecord(raw.scores) && Array.isArray(raw.scores.abilities) && typeof raw.scores.min === "number") {
    const abilities = raw.scores.abilities.filter(isAbilityKey);

    if (abilities.length > 0) out.scores = { abilities, min: raw.scores.min };
  }

  if (typeof raw.text === "string" && raw.text.trim()) out.text = raw.text;

  return out;
}

export function toFeatData(row: Feat): FeatData {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    type: (FEAT_TYPES as readonly string[]).includes(row.type) ? (row.type as FeatType) : "general",
    prerequisite: prerequisiteOf(row.prerequisite),
    repeatable: row.repeatable,
    description: row.description,
    abilities: featAbilities(row),
    choices: readChoiceList(row.choices),
  };
}
