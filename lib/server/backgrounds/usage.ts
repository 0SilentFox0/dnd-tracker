import "server-only";
import { prisma } from "@/lib/db";

export async function backgroundInUse(campaignId: string, id: string): Promise<boolean> {
  return (await prisma.character.count({ where: { campaignId, backgroundId: id } })) > 0;
}
