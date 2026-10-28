import { prisma } from "@/lib/db";

export function loadRaceProgression(campaignId: string, race: string) {
  return prisma.race.findFirst({ where: { campaignId, name: race }, select: { spellSlotProgression: true } });
}
