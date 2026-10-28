import { prisma } from "@/lib/db";
import { nameTaken } from "@/lib/server/content/name-taken";

export const raceNameTaken = (campaignId: string, name: string, exceptId?: string): Promise<boolean> => nameTaken((where) => prisma.race.findFirst({ where, select: { id: true } }), campaignId, name, exceptId);
