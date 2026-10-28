import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

export async function createSyntheticCampaign(db: PrismaClient, runId: string) {
  const marker = `assistant-${runId}-${randomUUID()}`;

  const user = await db.user.create({ data: { id: marker, email: `${marker}@example.invalid`, displayName: marker } });

  try {
    const campaign = await db.campaign.create({ data: { name: marker, dmUserId: marker, inviteCode: randomUUID(), members: { create: { userId: marker, role: "dm" } } } });

    const thread = await db.aiThread.create({ data: { campaignId: campaign.id, userId: marker, title: marker, provider: "anthropic", model: "synthetic", mode: "scenario" } });

    return { marker, userId: user.id, campaignId: campaign.id, threadId: thread.id };
  } catch (error) {
    await db.user.delete({ where: { id: user.id } });
    throw error;
  }
}

export async function deleteSyntheticCampaign(db: PrismaClient, fixture: { marker: string; userId: string; campaignId: string }) {
  const campaign = await db.campaign.findUnique({ where: { id: fixture.campaignId }, select: { id: true, name: true, dmUserId: true } });

  if (campaign && (campaign.name !== fixture.marker || campaign.dmUserId !== fixture.userId)) throw new Error("ASSISTANT_FIXTURE_OWNERSHIP_MISMATCH");

  await db.assistantReceipt.deleteMany({ where: { campaignId: fixture.campaignId, userId: fixture.userId } });

  if (campaign) await db.campaign.delete({ where: { id: campaign.id } });

  const user = await db.user.findUnique({ where: { id: fixture.userId }, select: { id: true, email: true, displayName: true, campaignMembers: { select: { id: true } }, dmCampaigns: { select: { id: true } } } });

  if (!user) return;

  if (user.email !== `${fixture.marker}@example.invalid` || user.displayName !== fixture.marker || user.campaignMembers.length || user.dmCampaigns.length) throw new Error("ASSISTANT_FIXTURE_OWNERSHIP_MISMATCH");

  await db.user.delete({ where: { id: user.id } });
}
