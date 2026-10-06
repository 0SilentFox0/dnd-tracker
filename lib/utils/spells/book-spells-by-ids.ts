import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { toBookSpell } from "@/lib/utils/spells/to-book-spell";
import type { BookSpell } from "@/types/spells";

export const BOOK_SPELL_SELECT = {
  id: true,
  name: true,
  level: true,
  type: true,
  damageType: true,
  diceCount: true,
  diceType: true,
  savingThrow: true,
  hitCheck: true,
  description: true,
  icon: true,
  range: true,
  duration: true,
  concentration: true,
  damageElement: true,
  spellGroup: { select: { id: true, name: true } },
} satisfies Prisma.SpellSelect;

export async function loadBookSpellsByIds(campaignId: string, ids: string[]): Promise<BookSpell[]> {
  if (ids.length === 0) return [];

  const rows = await prisma.spell.findMany({ where: { campaignId, id: { in: ids } }, select: BOOK_SPELL_SELECT });

  return rows.map(toBookSpell);
}
