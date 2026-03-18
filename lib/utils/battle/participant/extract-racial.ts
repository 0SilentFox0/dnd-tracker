/**
 * Витягування расових здібностей з Race
 */

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { RacialAbility } from "@/types/battle";

/**
 * Витягує расові здібності з Race
 */
export async function extractRacialAbilities(
  raceName: string,
  campaignId: string,
  preloadedRace?: Prisma.RaceGetPayload<object> | null,
): Promise<RacialAbility[]> {
  const racialAbilities: RacialAbility[] = [];

  const race =
    preloadedRace ??
    (await prisma.race.findFirst({
      where: { campaignId, name: raceName },
    }));

  if (!race || !race.passiveAbility) {
    return racialAbilities;
  }

  const passiveAbility = race.passiveAbility as Record<string, unknown>;

  if (typeof passiveAbility === "object" && passiveAbility !== null) {
    racialAbilities.push({
      id: `race_${race.id}_ability`,
      name: `Расові здібності: ${raceName}`,
      effect: passiveAbility,
    });
  }

  return racialAbilities;
}
