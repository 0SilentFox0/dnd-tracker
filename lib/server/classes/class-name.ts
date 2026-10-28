import { prisma } from "@/lib/db";
import { nameTaken } from "@/lib/server/content/name-taken";

export const classNameTaken = (campaignId: string, name: string, exceptId?: string): Promise<boolean> => nameTaken((where) => prisma.gameClass.findFirst({ where, select: { id: true } }), campaignId, name, exceptId);
