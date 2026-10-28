import "server-only";
import { prisma } from "@/lib/db";
import { urlsUsedElsewhere } from "@/lib/server/show/deck-store";
import { ownedSlidePath, removeSlideFiles } from "@/lib/supabase/scene-slide-storage";
import type { AiProposalOp } from "@/types/ai";

export type DiscardOutcome = "removed" | "kept" | "foreign";

/** Deletes a generated preview unless a deck or an open slide proposal still points to it. */
export async function discardGeneratedImage(campaignId: string, url: string): Promise<DiscardOutcome> {
  if (!ownedSlidePath(campaignId, url)) return "foreign";

  if ((await urlsUsedElsewhere(campaignId, "")).has(url)) return "kept";

  const open = await prisma.aiProposal.findMany({ where: { campaignId, status: { in: ["pending", "stale"] } }, select: { ops: true } });

  if (open.some((r) => (r.ops as unknown as AiProposalOp[]).some((o) => o.op === "addSlide" && o.slide.imageUrl === url))) return "kept";

  await removeSlideFiles(campaignId, [url]);

  return "removed";
}
