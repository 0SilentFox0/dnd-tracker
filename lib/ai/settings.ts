import "server-only";
import { prisma } from "@/lib/db";
import type { AiSettings } from "@/types/ai";

export async function getAiSettings(campaignId: string): Promise<AiSettings> {
  const row = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { aiInstructions: true } });

  return { instructions: row?.aiInstructions ?? null };
}

export async function saveAiSettings(campaignId: string, instructions: string | null): Promise<AiSettings> {
  const row = await prisma.campaign.update({ where: { id: campaignId }, data: { aiInstructions: instructions }, select: { aiInstructions: true } });

  return { instructions: row.aiInstructions };
}
