import "server-only";
import { getCachedClasses, getCachedFeats } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";
import { readChoiceList } from "@/lib/utils/abilities/read";
import { readSpellLists } from "@/lib/utils/characters/choices/read";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import { classesById } from "@/lib/utils/characters/classes";
import { toGameClassData } from "@/lib/utils/characters/classes/row";
import { toFeatData } from "@/lib/utils/feats/row";

export async function loadChoiceRefs(campaignId: string, raceName: string, opts: { classMode: boolean }): Promise<ChoiceRefs> {
  const raceRow = raceName ? await prisma.race.findFirst({ where: { campaignId, name: raceName }, select: { id: true, name: true, choices: true } }) : null;

  const raceChoices = raceRow ? readChoiceList(raceRow.choices) : [];

  const needFeats = opts.classMode || raceChoices.some((c) => c.kind === "feat");

  const [classes, feats, spells] = await Promise.all([
    opts.classMode ? getCachedClasses(campaignId) : [],
    needFeats ? getCachedFeats(campaignId) : [],
    prisma.spell.findMany({ where: { campaignId }, select: { id: true, name: true, level: true, lists: true } }),
  ]);

  return {
    race: raceRow ? { id: raceRow.id, name: raceRow.name, choices: raceChoices } : null,
    classesById: classesById(classes.map(toGameClassData)),
    featsById: Object.fromEntries(feats.map(toFeatData).map((f) => [f.id, f])),
    spellsById: Object.fromEntries(spells.map((s) => [s.id, { id: s.id, name: s.name, level: s.level, lists: readSpellLists(s.lists) }])),
  };
}
