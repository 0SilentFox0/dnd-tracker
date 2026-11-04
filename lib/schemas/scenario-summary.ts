import { z } from "zod";

export const SUMMARY_LIMITS = { overview: 600, events: 8, event: 160, secrets: 5, secret: 200, entities: 20, digest: 300, relations: 12, relation: 120 } as const;

const relationSchema = z.object({ a: z.string(), b: z.string(), label: z.string().max(SUMMARY_LIMITS.relation) });

export const summaryRelationsSchema = z.object({ relations: z.array(relationSchema).max(SUMMARY_LIMITS.relations) });

export const pageSummarySchema = z.object({
  overview: z.string().max(SUMMARY_LIMITS.overview),
  events: z.array(z.string().max(SUMMARY_LIMITS.event)).max(SUMMARY_LIMITS.events),
  secrets: z.array(z.string().max(SUMMARY_LIMITS.secret)).max(SUMMARY_LIMITS.secrets),
  entities: z.array(z.string()).max(SUMMARY_LIMITS.entities),
  digest: z.string().max(SUMMARY_LIMITS.digest),
  relations: z.array(relationSchema).max(SUMMARY_LIMITS.relations).optional(),
});

export const lenientSummarySchema = z.object({
  overview: z.string(),
  events: z.array(z.string()),
  secrets: z.array(z.string()),
  entities: z.array(z.string()),
  digest: z.string(),
  relations: z.array(z.object({ a: z.string(), b: z.string(), label: z.string() })),
});

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);

export function clampSummary(s: z.infer<typeof lenientSummarySchema>): PageSummary {
  return {
    overview: clip(s.overview, SUMMARY_LIMITS.overview),
    events: s.events.slice(0, SUMMARY_LIMITS.events).map((e) => clip(e, SUMMARY_LIMITS.event)),
    secrets: s.secrets.slice(0, SUMMARY_LIMITS.secrets).map((e) => clip(e, SUMMARY_LIMITS.secret)),
    entities: s.entities.slice(0, SUMMARY_LIMITS.entities),
    digest: clip(s.digest, SUMMARY_LIMITS.digest),
    relations: s.relations
      .filter((r) => r.a !== r.b)
      .slice(0, SUMMARY_LIMITS.relations)
      .map((r) => ({ ...r, label: clip(r.label, SUMMARY_LIMITS.relation) })),
  };
}

export type PageSummary = z.infer<typeof pageSummarySchema>;

export const generateSummaryBodySchema = z.object({ force: z.boolean().optional() });
