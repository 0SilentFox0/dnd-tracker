import { BUNDLE_TABLES } from "./bundle";

import { CampaignKind, CampaignRole, CampaignVisibility } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import type { TemplateCard, TemplateList } from "@/types/campaigns";

const select = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  credits: true,
  _count: { select: Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, true])) },
} as const;

const toCard = ({ _count, ...t }: { id: string; name: string; description: string | null; visibility: string; credits: string | null; _count: Record<string, number> }): TemplateCard => ({
  ...t,
  counts: _count,
});

export async function listTemplates(userId: string): Promise<TemplateList> {
  const [official, mine] = await Promise.all([
    prisma.campaign.findMany({ where: { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL }, select, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({
      where: {
        kind: CampaignKind.TEMPLATE,
        visibility: { not: CampaignVisibility.OFFICIAL },
        members: { some: { userId, role: CampaignRole.DM } },
      },
      select,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { official: official.map(toCard), mine: mine.map(toCard) };
}
