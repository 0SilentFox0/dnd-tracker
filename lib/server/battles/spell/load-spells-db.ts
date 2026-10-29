import { prisma } from "@/lib/db";

export const loadSpellsFromDb = (campaignId: string, ids: string[]) => prisma.spell.findMany({ where: { campaignId, id: { in: ids } } });
