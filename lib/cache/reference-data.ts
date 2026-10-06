import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { withAbilitySummary } from "@/lib/utils/abilities/summary";

const REFERENCE_REVALIDATE_SECONDS = 300; // 5 хвилин

export async function getCachedSpells(campaignId: string) {
  return unstable_cache(
    async () =>
      prisma.spell.findMany({
        where: { campaignId },
        include: { spellGroup: true },
        orderBy: { level: "asc" },
      }),
    [`spells`, campaignId],
    {
      tags: [`spells-${campaignId}`],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}

export const UNIT_LIST_ORDER: Prisma.UnitOrderByWithRelationInput[] = [{ level: "asc" }, { name: "asc" }];

export async function getCachedUnits(campaignId: string) {
  return unstable_cache(
    async () =>
      prisma.unit
        .findMany({ where: { campaignId }, orderBy: UNIT_LIST_ORDER })
        .then((units) => units.map((u) => withAbilitySummary("unit", u))),
    [`units`, campaignId],
    {
      tags: [`units-${campaignId}`],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}

export async function getCachedRaces(campaignId: string) {
  return unstable_cache(
    async () =>
      prisma.race.findMany({ omit: { abilities: true },
        where: { campaignId },
        orderBy: { createdAt: "desc" },
      }),
    [`races`, campaignId],
    {
      tags: [`races-${campaignId}`],
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
    [`main-skills`, campaignId],
    {
      tags: [`main-skills-${campaignId}`],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}
