import "server-only";
import { prisma } from "@/lib/db";
import { nameTaken } from "@/lib/server/content/name-taken";

export function careerNameTaken(campaignId: string, name: string, exceptId?: string): Promise<boolean> {
  return nameTaken((where) => prisma.career.findFirst({ where, select: { id: true } }), campaignId, name, exceptId);
}
