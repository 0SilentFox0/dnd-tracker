import { prisma } from "@/lib/db";

export async function classNameTaken(campaignId: string, name: string, exceptId?: string): Promise<boolean> {
  const clash = await prisma.gameClass.findFirst({
    where: { campaignId, name: { equals: name, mode: "insensitive" }, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true },
  });

  return clash !== null;
}
