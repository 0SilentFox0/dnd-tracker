import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  maxLevel: z.number().min(1).max(30).default(20),
  xpMultiplier: z.number().min(1).max(10).default(2.5),
  allowPlayerEdit: z.boolean().default(true),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  maxLevel: z.number().min(1).max(30).optional(),
  xpMultiplier: z.number().min(1).max(10).optional(),
  allowPlayerEdit: z.boolean().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const joinCampaignSchema = z.object({
  inviteCode: z.string().min(1),
});

export type JoinCampaignInput = z.infer<typeof joinCampaignSchema>;
