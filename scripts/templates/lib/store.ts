import type { Prisma } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";

import { CampaignKind, CampaignVisibility, DEFAULT_TEMPLATE_LOCALE } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { emptyBundle } from "@/lib/server/templates/bundle";
import { templateLocaleWhere } from "@/lib/server/templates/locale-filter";
import { jsonContent } from "@/lib/utils/common/json";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { TemplateManifest } from "@/lib/utils/templates/manifest";
import { templateKeyOf } from "@/lib/utils/templates/registry";

export interface TemplateRow {
  id: string;
  dmUserId: string;
}

export interface TemplateStore {
  findTemplate(): Promise<TemplateRow | null>;
  findOfficialOwner(): Promise<string | null>;
  create(input: { userId: string; rules: Ruleset; credits: string; description?: string }): Promise<TemplateRow>;
  update(id: string, input: { rules: Ruleset; credits: string; description?: string }): Promise<TemplateRow>;
}

const official = { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL };

export const makeTemplateStore = (manifest: TemplateManifest, locale: string = DEFAULT_TEMPLATE_LOCALE): TemplateStore => {
  const name = manifest.names.en;

  return {
    findTemplate: async () => {
      const candidates = await prisma.campaign.findMany({
        where: { ...official, AND: [{ OR: [{ templateKey: manifest.key }, { name, templateKey: null }, { name, templateKey: name }] }, templateLocaleWhere(locale)] },
        select: { id: true, dmUserId: true },
      });

      if (candidates.length > 1) throw new Error(`Ambiguous official template "${manifest.key}" [${locale}]; resolve duplicate sources before seeding.`);

      return candidates[0] ?? null;
    },
    findOfficialOwner: async () => (await prisma.campaign.findFirst({ where: official, orderBy: { createdAt: "asc" }, select: { dmUserId: true } }))?.dmUserId ?? null,
    create: async ({ userId, rules, credits, description }) => {
      const { campaign } = await createCampaignFromBundle({ userId, name, description, bundle: { ...emptyBundle(), rules, credits }, ...official });

      await prisma.campaign.update({ where: { id: campaign.id }, data: { locale, templateKey: manifest.key } });

      return { id: campaign.id, dmUserId: campaign.dmUserId };
    },
    update: async (id, { rules, credits, description }) => {
      const current = await prisma.campaign.findUniqueOrThrow({ where: { id }, select: { dmUserId: true, rules: true, credits: true, description: true, locale: true, templateKey: true } });

      const contentSame = isDeepStrictEqual(current.rules, jsonContent(rules)) && current.credits === credits && (description === undefined || current.description === description) && (current.locale ?? DEFAULT_TEMPLATE_LOCALE) === locale;

      if (!contentSame || current.templateKey !== manifest.key || current.locale !== locale) {
        await prisma.campaign.update({ where: { id }, data: { rules: rules as Prisma.InputJsonObject, credits, ...(description !== undefined && { description }), locale, templateKey: manifest.key, ...(!contentSame && { contentVersion: { increment: 1 } }) } });
      }

      return { id, dmUserId: current.dmUserId };
    },
  };
};

export async function ensureTemplate(store: TemplateStore, opts: { owner?: string; rules: Ruleset; credits: string; description?: string }): Promise<{ id: string; dmUserId: string; created: boolean }> {
  const { owner, ...content } = opts;

  const existing = await store.findTemplate();

  if (existing) return { ...(await store.update(existing.id, content)), created: false };

  const userId = owner ?? (await store.findOfficialOwner());

  if (!userId) throw new Error("Немає власника шаблону: передайте --owner <userId> (офіційних шаблонів ще немає)");

  return { ...(await store.create({ userId, ...content })), created: true };
}

export function planKeyBackfill(rows: { id: string; name: string; templateKey: string | null; locale: string | null }[]): { id: string; from: string | null; to: string }[] {
  return rows.flatMap((row) => {
    const to = templateKeyOf(row);

    return to && to !== row.templateKey ? [{ id: row.id, from: row.templateKey, to }] : [];
  });
}
