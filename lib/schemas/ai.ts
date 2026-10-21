import { z } from "zod";

import { AI_LIMITS, AI_PROVIDERS, AI_THREAD_MODES } from "@/lib/constants/ai";

const id = z.string().min(1).max(40);

const markdown = z.string().max(20_000);

export const aiProviderSchema = z.enum(AI_PROVIDERS);

export const saveCredentialSchema = z.object({ apiKey: z.string().trim().min(10).max(500), defaultModel: z.string().max(100).nullish() });

export const patchCredentialSchema = z.object({ defaultModel: z.string().max(100).nullable() });

export const createThreadSchema = z.object({ mode: z.enum(AI_THREAD_MODES), scenarioPageId: id.nullish(), provider: aiProviderSchema, model: z.string().max(100).optional() });

export const patchThreadSchema = z
  .object({ title: z.string().trim().min(1).max(AI_LIMITS.threadTitleChars).optional(), provider: aiProviderSchema.optional(), model: z.string().max(100).optional() })
  .refine((b) => Object.keys(b).length > 0, { message: "Порожня зміна" });

export const aiFocusSchema = z.object({ pageId: id, sectionId: id.optional(), rowIds: z.array(id).max(20).optional() });

export const chatRequestSchema = z.object({ text: z.string().trim().min(1).max(AI_LIMITS.messageChars), focus: aiFocusSchema.optional() });

export const scenarioAiOpInputSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("replaceRow"), sectionId: id, rowId: id, story: markdown.optional(), notes: markdown.optional(), allowRemoval: z.boolean().optional() }).refine((o) => o.story !== undefined || o.notes !== undefined, { message: "replaceRow: потрібне story або notes" }),
  z.object({ op: z.literal("insertRow"), sectionId: id, afterRowId: id.optional(), story: markdown, notes: markdown.optional() }),
  z.object({ op: z.literal("addSection"), afterSectionId: id.optional(), title: z.string().trim().min(1).max(200), rows: z.array(z.object({ story: markdown, notes: markdown.optional() })).min(1).max(30) }),
  z.object({ op: z.literal("renameSection"), sectionId: id, title: z.string().trim().min(1).max(200) }),
]);

export const proposeScenarioEditSchema = z.object({ pageId: id, summary: z.string().trim().min(1).max(300), ops: z.array(scenarioAiOpInputSchema).min(1).max(30) });

export const aiSettingsSchema = z.object({ instructions: z.string().max(AI_LIMITS.instructionsChars) });

export const createApiTokenSchema = z.object({ name: z.string().trim().min(1).max(60) });
