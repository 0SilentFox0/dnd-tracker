import { z } from "zod";

export const SUMMARY_LIMITS = { overview: 600, events: 8, event: 160, secrets: 5, secret: 200, entities: 20, digest: 300 } as const;

export const pageSummarySchema = z.object({
  overview: z.string().max(SUMMARY_LIMITS.overview),
  events: z.array(z.string().max(SUMMARY_LIMITS.event)).max(SUMMARY_LIMITS.events),
  secrets: z.array(z.string().max(SUMMARY_LIMITS.secret)).max(SUMMARY_LIMITS.secrets),
  entities: z.array(z.string()).max(SUMMARY_LIMITS.entities),
  digest: z.string().max(SUMMARY_LIMITS.digest),
});

export type PageSummary = z.infer<typeof pageSummarySchema>;

export const generateSummaryBodySchema = z.object({ force: z.boolean().optional() });
