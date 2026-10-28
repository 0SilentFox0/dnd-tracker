import { prisma } from "@/lib/db";
import { nameTaken } from "@/lib/server/content/name-taken";

export const featNameTaken = (campaignId: string, name: string, exceptId?: string): Promise<boolean> => nameTaken((where) => prisma.feat.findFirst({ where, select: { id: true } }), campaignId, name, exceptId);
