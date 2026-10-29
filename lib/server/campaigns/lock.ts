import type { Prisma } from "@prisma/client";

export type CampaignLockMode = "update" | "no-key-update";

export async function lockCampaignRow(tx: Pick<Prisma.TransactionClient, "$queryRaw">, campaignId: string, mode: CampaignLockMode = "update"): Promise<Array<{ id: string }>> {
  return mode === "no-key-update"
    ? tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM campaigns WHERE id = ${campaignId} FOR NO KEY UPDATE`
    : tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM campaigns WHERE id = ${campaignId} FOR UPDATE`;
}
