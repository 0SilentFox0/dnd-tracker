import type { Prisma } from "@prisma/client";

export async function bumpContentVersion(db: Pick<Prisma.TransactionClient, "campaign">, campaignId: string): Promise<number> {
  const { contentVersion } = await db.campaign.update({ where: { id: campaignId }, data: { contentVersion: { increment: 1 } }, select: { contentVersion: true } });

  return contentVersion;
}
