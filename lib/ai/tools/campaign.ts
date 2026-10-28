import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import "server-only";
import { prisma } from "@/lib/db";

export const getCampaignBriefTool = defineTool({
  name: "get_campaign_brief",
  scopes: ["ai"],
  title: "Опис кампанії",
  description: "Campaign name, description and the DM's standing instructions (tone, atmosphere, setting rules). Call this first when starting work from an external client.",
  input: z.object({}),
  handler: async (ctx) => {
    const campaign = await prisma.campaign.findUnique({ where: { id: ctx.campaignId }, select: { name: true, description: true, aiInstructions: true } });

    if (!campaign) throw new AiToolError("Кампанію не знайдено");

    return { name: campaign.name, description: campaign.description, instructions: campaign.aiInstructions };
  },
});
