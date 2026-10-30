import type { Spell } from "@prisma/client";

import type { CastableSpell } from "../types/spell-process";

import { SpellIngredientsSchema } from "@/lib/schemas/spell-ingredients";
import { parseSpellFx } from "@/lib/utils/battle/fx/spell-fx-schema";
import { readSpellDefinition } from "@/lib/utils/spells/model/read";

export function toCastableSpell(row: Spell): CastableSpell {
  return { id: row.id, name: row.name, level: row.level, groupId: row.groupId, icon: row.icon, fx: parseSpellFx(row.fx), definition: readSpellDefinition(row), ingredients: SpellIngredientsSchema.safeParse(row.ingredients).data ?? [] };
}
