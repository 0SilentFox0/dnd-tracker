import type { Prisma } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";

import type { TemplateStore } from "./load-template";

import { CampaignKind, CampaignVisibility, DEFAULT_TEMPLATE_LOCALE, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { emptyBundle } from "@/lib/server/templates/bundle";
import { templateLocaleWhere } from "@/lib/server/templates/locale-filter";
import { jsonContent } from "@/lib/utils/common/json";

const official = { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL };

export const makeTemplateStore = (name: string, locale: string = DEFAULT_TEMPLATE_LOCALE): TemplateStore => ({
  findTemplate: async () => {
    if (name === SRD_TEMPLATE_NAME && locale === DEFAULT_TEMPLATE_LOCALE) {
      const candidates = await prisma.campaign.findMany({ where: { ...official, AND: [{ OR: [{ name, templateKey: null }, { templateKey: name }] }, templateLocaleWhere(locale)] }, select: { id: true, dmUserId: true } });

      if (candidates.length > 1) throw new Error("Ambiguous canonical English SRD template; resolve duplicate sources before seeding.");

      return candidates[0] ?? null;
    }

    return prisma.campaign.findFirst({ where: { name, ...official, ...templateLocaleWhere(locale) }, select: { id: true, dmUserId: true } });
  },
  findOfficialOwner: async () => (await prisma.campaign.findFirst({ where: official, orderBy: { createdAt: "asc" }, select: { dmUserId: true } }))?.dmUserId ?? null,
  create: async ({ userId, rules, credits, description }) => {
    const { campaign } = await createCampaignFromBundle({ userId, name, description, bundle: { ...emptyBundle(), rules, credits }, ...official });

    await prisma.campaign.update({ where: { id: campaign.id }, data: { locale, templateKey: name } });

    return { id: campaign.id, dmUserId: campaign.dmUserId };
  },
  update: async (id, { rules, credits, description }) => {
    const current = await prisma.campaign.findUniqueOrThrow({ where: { id }, select: { rules: true, credits: true, description: true, locale: true, templateKey: true } });

    const same = isDeepStrictEqual(current.rules, jsonContent(rules)) && current.credits === credits && current.description === description && current.locale === locale && current.templateKey === name;

    if (same) return;

    await prisma.campaign.update({ where: { id }, data: { rules: rules as Prisma.InputJsonObject, credits, description, locale, templateKey: name, contentVersion: { increment: 1 } } });
  },
});
