import "server-only";
import { discardGeneratedImage } from "@/lib/ai/generated-images";
import { prisma } from "@/lib/db";
import type { JsonValue } from "@/lib/server/assistant/types";
import { readShowState } from "@/lib/server/show/show-store";

/** Recheck live references after commit; owned path checks stay in the existing cleanup. */
export async function runShowMediaCleanup(payload: JsonValue): Promise<void> {
  const { campaignId, urls } = payload as { campaignId: string; urls: string[] };

  for (const url of urls) {
    const show = await readShowState(campaignId);

    if (show?.slide?.imageUrl === url || show?.cover?.slide.imageUrl === url || show?.nextImageUrl === url) continue;

    const pending = await prisma.assistantReceipt.findMany({ where: { campaignId, status: "executing" }, select: { effects: true } });

    if (pending.some(r => JSON.stringify(r.effects).includes(url))) continue;

    await discardGeneratedImage(campaignId, url, true);
  }
}
