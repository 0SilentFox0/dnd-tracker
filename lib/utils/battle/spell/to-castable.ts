import type { Spell } from "@prisma/client";

import type { CastableSpell } from "../types/spell-process";

import { readSpellDefinition } from "@/lib/utils/spells/model/read";

export function toCastableSpell(row: Spell): CastableSpell {
  return { id: row.id, name: row.name, level: row.level, groupId: row.groupId, icon: row.icon, definition: readSpellDefinition(row) };
}
