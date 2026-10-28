import "server-only";
import { prisma } from "@/lib/db";
import { urlsUsedElsewhere } from "@/lib/server/show/deck-store";
import { removeSlideFiles } from "@/lib/supabase/scene-slide-storage";
import type { AiProposalOp } from "@/types/ai";
export const slideUrls = (ops: AiProposalOp[]) => ops.flatMap((o) => (o.op === "addSlide" ? [o.slide.imageUrl] : []));

export async function discardSlideFiles(campaignId: string, urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  const used = await urlsUsedElsewhere(campaignId, "");

  await removeSlideFiles(campaignId, urls.filter((u) => !used.has(u)));
}

/** Read before the page is deleted: its proposals cascade away with it. */
export async function pendingSlideUrls(campaignId: string, pageId: string): Promise<string[]> {
  const rows = await prisma.aiProposal.findMany({ where: { campaignId, pageId, status: { in: ["pending", "stale"] } }, select: { ops: true } });

  return rows.flatMap((r) => slideUrls(r.ops as unknown as AiProposalOp[]));
}
