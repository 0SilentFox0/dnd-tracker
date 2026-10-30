import type { Prisma } from "@prisma/client";

import type { TemplateStore } from "./load-template";

import { CampaignKind, CampaignVisibility } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { emptyBundle } from "@/lib/server/templates/bundle";

const official = { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL };

export const makeTemplateStore = (name: string): TemplateStore => ({
  findTemplate: () => prisma.campaign.findFirst({ where: { name, ...official }, select: { id: true, dmUserId: true } }),
  findOfficialOwner: async () => (await prisma.campaign.findFirst({ where: official, orderBy: { createdAt: "asc" }, select: { dmUserId: true } }))?.dmUserId ?? null,
  create: async ({ userId, rules, credits, description }) => {
    const { campaign } = await createCampaignFromBundle({ userId, name, description, bundle: { ...emptyBundle(), rules, credits }, ...official });

    return { id: campaign.id, dmUserId: campaign.dmUserId };
  },
  update: async (id, { rules, credits, description }) => {
    await prisma.campaign.update({ where: { id }, data: { rules: rules as Prisma.InputJsonObject, credits, description } });
  },
});
