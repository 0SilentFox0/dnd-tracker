import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { classDraftSchema, draftSchema } from "./draft-schema";

import { getCachedClasses } from "@/lib/cache/reference-data";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { applyClasses, type ClassesApplied, type ClassesApplyResult } from "@/lib/server/characters/apply-classes";
import { parseBody } from "@/lib/utils/api/parse-body";
import { classesById, classModeOf } from "@/lib/utils/characters/classes";
import { toGameClassData } from "@/lib/utils/characters/classes/row";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

type ClassesById = Record<string, GameClassData>;

const classFields = (applied: ClassesApplied) => ({
  class: applied.class,
  subclass: applied.subclass,
  level: applied.level,
  classes: applied.classes as unknown as Prisma.InputJsonValue,
  archetype: null,
  spellcastingAbility: applied.spellcastingAbility,
});

export type DraftClassResult = { ok: true; fields: ReturnType<typeof classFields>; spellSlots: ClassesApplied["spellSlots"] } | Extract<ClassesApplyResult, { ok: false }>;

async function loadClassMode(campaignId: string, rules?: Ruleset): Promise<ClassesById | null> {
  if (!rules?.classes.enabled) return null;

  const byId = classesById((await getCachedClasses(campaignId)).map(toGameClassData));

  return classModeOf(true, Object.keys(byId).length) ? byId : null;
}

export const isClassMode = async (campaignId: string, rules?: Ruleset): Promise<boolean> => !!(await loadClassMode(campaignId, rules));

export type ParsedDraft =
  | { data: z.infer<typeof draftSchema>; asClass: null }
  | { data: z.infer<typeof classDraftSchema>; asClass: { classId: string | undefined; classesById: ClassesById } };

export async function parseDraftBody(request: Request, campaign: { id: string; rules: Ruleset }): Promise<ParsedDraft | NextResponse> {
  const byId = await loadClassMode(campaign.id, campaign.rules);

  if (!byId) {
    const data = await parseBody<z.infer<typeof draftSchema>>(draftSchema, request);

    return data instanceof NextResponse ? data : { data, asClass: null };
  }

  const data = await parseBody<z.infer<typeof classDraftSchema>>(classDraftSchema, request);

  return data instanceof NextResponse ? data : { data, asClass: { classId: data.classId, classesById: byId } };
}

export async function resolveDraftClass(input: { campaignId: string; rules: Ruleset; maxLevel: number; classId: string | undefined; classesById?: ClassesById }): Promise<DraftClassResult> {
  if (!input.classId) return { ok: false, status: 422, error: API_ERRORS.DRAFT_CLASS_REQUIRED };

  const applied = await applyClasses({
    campaignId: input.campaignId,
    rules: input.rules,
    maxLevel: Math.max(input.maxLevel, 1),
    entries: [{ classId: input.classId, level: 1 }],
    spellcastingAbility: null,
    preloaded: input.classesById,
  });

  if (!applied.ok) return applied;

  if (!applied.data) return { ok: false, status: 422, error: API_ERRORS.DRAFT_CLASS_REQUIRED };

  return { ok: true, fields: classFields(applied.data), spellSlots: applied.data.spellSlots };
}
