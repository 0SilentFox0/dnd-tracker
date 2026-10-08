import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import type { BookSpell } from "@/types/spells";

export interface SpellRow {
  id: string;
  name: string;
  level: number;
  description: string | null;
  icon: string | null;
  spellGroup: { id: string; name: string } | null;
  dice?: number;
  cost?: string;
  targeting?: unknown;
  resolution?: unknown;
}

export function toBookSpell(row: SpellRow): BookSpell {
  const { dice, cost, targeting, resolution } = readSpellDefinition(row);

  return { ...row, dice, cost, targeting, resolution };
}
