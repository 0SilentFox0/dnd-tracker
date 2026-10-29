import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";

import { cacheTags } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { currentContentWrite } from "@/lib/server/content/write-context";
import { toUnit } from "@/lib/utils/units/to-unit";

// A guarded write must use the transaction snapshot, never a previously cached reference.
const referenceCache: typeof unstable_cache = (callback, keyParts, options) =>
  currentContentWrite() ? callback : unstable_cache(callback, keyParts, options);

export const REFERENCE_REVALIDATE_SECONDS = 300;

export async function getCachedSpells(campaignId: string) {
  return referenceCache(
    async () =>
      prisma.spell.findMany({
        where: { campaignId },
        include: { spellGroup: true },
        orderBy: { level: "asc" },
      }),
    [cacheTags.spells(campaignId)],
    {
      tags: [cacheTags.spells(campaignId)],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}

const UNIT_LIST_ORDER: Prisma.UnitOrderByWithRelationInput[] = [{ level: "asc" }, { name: "asc" }];

export async function getCachedUnits(campaignId: string) {
  return referenceCache(
    async () =>
      prisma.unit
        .findMany({ where: { campaignId }, orderBy: UNIT_LIST_ORDER })
        .then((units) => units.map(toUnit)),
    ["units-v2", cacheTags.units(campaignId)],
    {
      tags: [cacheTags.units(campaignId)],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}

export async function getCachedRaces(campaignId: string) {
  return referenceCache(
    async () =>
      prisma.race.findMany({
        omit: { abilities: true },
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      }),
    [cacheTags.races(campaignId)],
    {
      tags: [cacheTags.races(campaignId)],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}

export async function getCachedClasses(campaignId: string) {
  return referenceCache(
    async () => prisma.gameClass.findMany({ where: { campaignId }, orderBy: { createdAt: "asc" } }),
    [cacheTags.classes(campaignId)],
    {
      tags: [cacheTags.classes(campaignId)],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}

export async function getCachedFeats(campaignId: string) {
  return referenceCache(
    async () => prisma.feat.findMany({ where: { campaignId }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    [cacheTags.feats(campaignId)],
    {
      tags: [cacheTags.feats(campaignId)],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}

export async function getCachedMainSkills(campaignId: string) {
  return referenceCache(
    async () =>
      prisma.mainSkill.findMany({
        where: { campaignId },
        orderBy: { createdAt: "asc" },
      }),
    [cacheTags.mainSkills(campaignId)],
    {
      tags: [cacheTags.mainSkills(campaignId)],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}

/** Лише колонки, потрібні для побудови прикликаного учасника (без createdAt/опису рас); інвалідація тегами units/races. */
export async function getCachedSummonPool(campaignId: string) {
  return referenceCache(
    async () => {
      const [units, races] = await Promise.all([
        prisma.unit.findMany({ where: { campaignId }, omit: { createdAt: true } }),
        prisma.race.findMany({
          where: { campaignId },
          select: { id: true, campaignId: true, name: true, abilities: true, passiveAbility: true },
        }),
      ]);

      return { units, races };
    },
    [cacheTags.units(campaignId), "summon-pool"],
    {
      tags: [cacheTags.units(campaignId), cacheTags.races(campaignId)],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}

export async function getCachedBackgrounds(campaignId: string) {
  return referenceCache(
    async () => prisma.background.findMany({ where: { campaignId }, orderBy: { name: "asc" } }),
    [cacheTags.backgrounds(campaignId)],
    { tags: [cacheTags.backgrounds(campaignId)], revalidate: REFERENCE_REVALIDATE_SECONDS },
  )();
}
