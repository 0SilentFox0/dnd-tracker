import { z } from "zod";

import { ACQUAINTANCE_KINDS, ACQUAINTANCE_LIMITS } from "@/lib/constants/acquaintances";

const nameField = z.string().trim().min(1).max(ACQUAINTANCE_LIMITS.name);
const descriptionField = z.string().max(ACQUAINTANCE_LIMITS.description);
const avatarField = z.string().url().max(2000).nullable();
const characterIdField = z.string().min(1).nullable();

export const createAcquaintanceSchema = z
  .object({
    kind: z.enum(ACQUAINTANCE_KINDS),
    characterId: characterIdField.optional(),
    name: nameField,
    description: descriptionField.default(""),
    avatarUrl: avatarField.optional(),
    sourcePageId: z.string().min(1),
    sourceSectionId: z.string().min(1),
  })
  .refine((d) => d.kind !== "character" || !!d.characterId, { path: ["characterId"] });

export const updateAcquaintanceSchema = z.object({
  kind: z.enum(ACQUAINTANCE_KINDS).optional(),
  characterId: characterIdField.optional(),
  name: nameField.optional(),
  description: descriptionField.optional(),
  avatarUrl: avatarField.optional(),
});

export const createAcquaintanceEntrySchema = z.object({
  pageId: z.string().min(1),
  sectionId: z.string().min(1),
  text: z.string().trim().min(1).max(ACQUAINTANCE_LIMITS.entry),
});

export const updateAcquaintanceEntrySchema = z.object({
  text: z.string().trim().min(1).max(ACQUAINTANCE_LIMITS.entry).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const saveAcquaintanceNoteSchema = z.object({
  text: z.string().max(ACQUAINTANCE_LIMITS.note),
});

export type CreateAcquaintanceData = z.infer<typeof createAcquaintanceSchema>;
export type UpdateAcquaintanceData = z.infer<typeof updateAcquaintanceSchema>;
export type CreateAcquaintanceEntryData = z.infer<typeof createAcquaintanceEntrySchema>;
export type UpdateAcquaintanceEntryData = z.infer<typeof updateAcquaintanceEntrySchema>;
export type SaveAcquaintanceNoteData = z.infer<typeof saveAcquaintanceNoteSchema>;
