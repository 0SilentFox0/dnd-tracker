import { z } from "zod";

import { CALLOUT_KINDS, LEGEND_KINDS, MARK_TYPES, NODE_TYPES, PAGE_KINDS, PAGE_STATUSES, SCENARIO_MAX_LEGEND, SECTION_ICON_KEYS } from "@/lib/constants/scenario";
import type { RichNode, ScenarioContent } from "@/types/scenario";

const attrsSchema = z.record(z.string(), z.unknown());

const markSchema = z.object({ type: z.enum(MARK_TYPES), attrs: attrsSchema.optional() });

export const richNodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z.object({
    type: z.enum(NODE_TYPES),
    attrs: attrsSchema.optional(),
    content: z.array(richNodeSchema).optional(),
    marks: z.array(markSchema).optional(),
    text: z.string().optional(),
  }),
);

const docSchema = z.object({ type: z.literal("doc"), content: z.array(richNodeSchema) });

const idSchema = z.string().min(1).max(40);

const revealSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("manual") }),
  z.object({ mode: z.literal("afterSection"), pageId: z.string().min(1), sectionId: z.string().min(1) }),
]);

const rowSchema = z.object({
  id: idSchema,
  story: docSchema,
  notes: docSchema,
  slide: z.object({ deckId: idSchema, slideId: z.string().min(1).max(64) }).optional(),
  battleId: idSchema.optional(),
});

const sectionSchema = z.object({
  id: idSchema,
  title: z.string().max(200),
  played: z.boolean(),
  icon: z.enum(SECTION_ICON_KEYS).optional(),
  reveal: revealSchema.optional(),
  revealedAt: z.string().nullable().optional(),
  rows: z.array(rowSchema).max(200),
});

const unique = (ids: string[]) => new Set(ids).size === ids.length;

export const scenarioContentSchema: z.ZodType<ScenarioContent> = z
  .object({
    legend: z.array(z.object({ kind: z.enum(LEGEND_KINDS), label: z.string().max(80) })).max(SCENARIO_MAX_LEGEND),
    sections: z.array(sectionSchema).max(200),
  })
  .refine((c) => unique(c.sections.map((s) => s.id)) && unique(c.sections.flatMap((s) => s.rows.map((r) => r.id))), { message: "Дубльовані id розділів або рядків" });

const optionalText = (max: number) => z.string().trim().max(max).nullish();

export const createScenarioPageSchema = z.object({
  kind: z.enum(PAGE_KINDS),
  title: z.string().trim().min(1).max(200),
  arc: optionalText(120),
  subtitle: optionalText(500),
  characterId: z.string().min(1).nullish(),
});

export const updateScenarioMetaSchema = createScenarioPageSchema.partial().extend({
  status: z.enum(PAGE_STATUSES).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const saveScenarioContentSchema = z.object({ expectedVersion: z.number().int().min(0), content: scenarioContentSchema });

export const scenarioSectionPatchSchema = z
  .object({ played: z.boolean().optional(), revealed: z.boolean().optional() })
  .refine((b) => b.played !== undefined || b.revealed !== undefined, { message: "Порожня зміна" });

export const restoreScenarioVersionSchema = z.object({ versionId: z.string().min(1) });

export const CALLOUT_KIND_SCHEMA = z.enum(CALLOUT_KINDS);
