/**
 * Server-side кеш для довідкових даних кампанії.
 * Зменшує навантаження на БД при частих читаннях spells, units, races, main-skills.
 */

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";

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

export async function getCachedUnits(campaignId: string) {
  return unstable_cache(
    async () =>
      prisma.unit.findMany({
        where: { campaignId },
        include: { unitGroup: true },
        orderBy: { createdAt: "desc" },
      }),
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
      prisma.race.findMany({
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
