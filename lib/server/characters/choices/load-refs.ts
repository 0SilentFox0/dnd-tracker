import type { Prisma } from "@prisma/client";

import "server-only";
import { getCachedBackgrounds, getCachedClasses, getCachedFeats } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";
import { readChoiceList } from "@/lib/utils/abilities/read";
import { toBackgroundData } from "@/lib/utils/backgrounds/row";
import { readSpellLists } from "@/lib/utils/characters/choices/read";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import { classesById } from "@/lib/utils/characters/classes";
import { toGameClassData } from "@/lib/utils/characters/classes/row";
import { toFeatData } from "@/lib/utils/feats/row";

export type ChoiceDb = Pick<Prisma.TransactionClient, "race" | "gameClass" | "feat" | "spell" | "background">;

export async function loadChoiceRefs(campaignId: string, raceName: string, opts: { classMode: boolean; backgroundIds?: (string | null | undefined)[]; db?: ChoiceDb }): Promise<ChoiceRefs> {
  const db = opts.db ?? prisma;

  const where = { campaignId };

  const raceRow = raceName ? await db.race.findFirst({ where: { campaignId, name: raceName }, select: { id: true, name: true, choices: true } }) : null;

  const raceChoices = raceRow ? readChoiceList(raceRow.choices) : [];

  const needFeats = opts.classMode || raceChoices.some((c) => c.kind === "feat");

  const [classes, feats, spells, backgrounds] = await Promise.all([
    opts.classMode ? opts.db ? db.gameClass.findMany({ where }) : getCachedClasses(campaignId) : [],
    needFeats ? opts.db ? db.feat.findMany({ where }) : getCachedFeats(campaignId) : [],
    db.spell.findMany({ where: { campaignId }, select: { id: true, name: true, level: true, lists: true } }),
    opts.classMode && opts.backgroundIds?.some(Boolean) ? opts.db ? db.background.findMany({ where }) : getCachedBackgrounds(campaignId) : [],
  ]);

  return {
    backgroundsById: Object.fromEntries(backgrounds.map(toBackgroundData).map((b) => [b.id, b])),
    race: raceRow ? { id: raceRow.id, name: raceRow.name, choices: raceChoices } : null,
    classesById: classesById(classes.map(toGameClassData)),
    featsById: Object.fromEntries(feats.map(toFeatData).map((f) => [f.id, f])),
    spellsById: Object.fromEntries(spells.map((s) => [s.id, { id: s.id, name: s.name, level: s.level, lists: readSpellLists(s.lists) }])),
  };
}
