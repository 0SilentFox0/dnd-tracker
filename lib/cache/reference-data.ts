import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";

import { cacheTags } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { toUnit } from "@/lib/utils/units/to-unit";

export const REFERENCE_REVALIDATE_SECONDS = 300;

export async function getCachedSpells(campaignId: string) {
  return unstable_cache(
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
  return unstable_cache(
    async () =>
      prisma.unit
        .findMany({ where: { campaignId }, orderBy: UNIT_LIST_ORDER })
        .then((units) => units.map(toUnit)),
    [cacheTags.units(campaignId)],
    {
      tags: [cacheTags.units(campaignId)],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}

export async function getCachedRaces(campaignId: string) {
  return unstable_cache(
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

export async function getCachedMainSkills(campaignId: string) {
  return unstable_cache(
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
