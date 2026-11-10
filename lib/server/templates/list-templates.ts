import { BUNDLE_TABLES } from "./bundle";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignKind, CampaignRole, CampaignVisibility } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";
import { parseRules } from "@/lib/utils/rules/schema";
import { systemKeyOf } from "@/lib/utils/rules/systems";
import { isCanonicalTemplate, isLegacyLocalizedTemplate, localizationOf, type TemplateIdentity, templateKeyOf } from "@/lib/utils/templates/registry";
import type { TemplateCard, TemplateList } from "@/types/campaigns";

const select = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  kind: true,
  credits: true,
  locale: true,
  templateKey: true,
  rules: true,
  _count: { select: Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, true])) },
} as const;

const toCard = ({ _count, rules, ...t }: { id: string; name: string; description: string | null; kind: string; visibility: string; credits: string | null; locale: string | null; templateKey: string | null; rules: unknown; _count: Record<string, number> }): TemplateCard => ({
  ...t,
  system: systemKeyOf(parseRules(rules)),
  counts: _count,
  ...(isCanonicalTemplate(t) && { availableLocales: localizationOf(t)?.locales }),
});

/** Shared by the picker API and the owner's direct tile query. */
export function visibleTemplates<T extends TemplateIdentity>(templates: T[]): T[] {
  const canonicalKeys = templates.filter(isCanonicalTemplate).map(templateKeyOf);

  if (new Set(canonicalKeys).size !== canonicalKeys.length) throw new ContentError(API_ERRORS.SRD_CANONICAL_UNAVAILABLE, 409);

  return templates.filter((template) => !isLegacyLocalizedTemplate(template));
}

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

  return { official: visibleTemplates(official).map(toCard), mine: mine.map(toCard) };
}
