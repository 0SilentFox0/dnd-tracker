import "server-only";
import { prisma } from "@/lib/db";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { type NotificationItem, notifyCampaignPlayers } from "@/lib/server/notifications/notify";
import { loadPlayedSections } from "@/lib/server/scenario/page-store";
import { revealedAcquaintanceIds } from "@/lib/utils/acquaintances/visibility";
import { logger } from "@/lib/utils/common/logger";
import { notificationHref } from "@/lib/utils/notifications/href";
import { newlyPlayedSections, playedLookup } from "@/lib/utils/scenario/reveal";
import type { ScenarioContent } from "@/types/scenario";

export async function notifyAcquaintanceReveal(campaignId: string, pageId: string, sectionIds: string[]): Promise<void> {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { acquaintancesEnabled: true } });

    if (!campaign?.acquaintancesEnabled) return;

    const rows = await prisma.acquaintance.findMany({
      where: { campaignId, OR: [{ sourcePageId: pageId, sourceSectionId: { in: sectionIds } }, { entries: { some: { pageId, sectionId: { in: sectionIds } } } }] },
      select: { id: true, sourcePageId: true, sourceSectionId: true },
    });

    const played = playedLookup(await loadPlayedSections(campaignId, [...new Set(rows.map((r) => r.sourcePageId))]));

    const items: NotificationItem[] = revealedAcquaintanceIds(rows, played).map((id) => ({ type: "acquaintance", refId: id, href: notificationHref(campaignId, "acquaintance", id) }));

    if (items.length) await notifyCampaignPlayers({ campaignId, items });
  } catch (error) {
    logger.error("[acquaintances] reveal notify failed", { campaignId, pageId }, error);
  }
}

export async function notifyRevealForContentChange(campaignId: string, pageId: string, before: ScenarioContent, after: ScenarioContent): Promise<void> {
  const sectionIds = newlyPlayedSections(before, after);

  if (!sectionIds.length) return;

  // both callers write inside a campaign transaction: notify only once it has committed
  afterContentCommit(() => notifyAcquaintanceReveal(campaignId, pageId, sectionIds));
}
