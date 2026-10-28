import { NextResponse } from "next/server";
import type { Character } from "@prisma/client";
import { z } from "zod";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { PicksSchema } from "@/lib/schemas/choices";
import { CharacterClassesSchema } from "@/lib/schemas/classes";
import { applyClasses, type ClassesApplied } from "@/lib/server/characters/apply-classes";
import { errorResponse } from "@/lib/utils/api/api-response";
import { multiclassBlockedBy } from "@/lib/utils/characters/classes/multiclass";
import { nextClassEntries } from "@/lib/utils/characters/level-up/class-level-up";
import type { Ruleset } from "@/lib/utils/rules/schema";

export const LevelUpBodySchema = z.object({ classId: z.string().min(1).optional(), subclassId: z.string().min(1).nullable().optional(), choices: PicksSchema.optional() });

export type LevelUpPick = z.infer<typeof LevelUpBodySchema>;

export async function readLevelUpPick(request: Request): Promise<LevelUpPick | NextResponse> {
  const text = await request.text();

  if (!text.trim()) return {};

  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch {
    return errorResponse(API_ERRORS.INVALID_JSON, 400);
  }

  const parsed = LevelUpBodySchema.safeParse(raw);

  return parsed.success ? parsed.data : errorResponse(API_ERRORS.INVALID_BODY, 400, parsed.error.issues);
}

interface ClassLevelUpInput {
  campaign: { id: string; maxLevel: number; rules: Ruleset };
  character: Pick<Character, "classes" | "spellcastingAbility" | "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma">;
  pick: LevelUpPick;
}

/** null — клас-шлях не застосовний (HOMM) */
export async function classLevelUp({ campaign, character, pick }: ClassLevelUpInput): Promise<NextResponse | ClassesApplied | null> {
  const current = CharacterClassesSchema.safeParse(character.classes);

  const entries = current.success ? current.data : [];

  if (!pick.classId) {
    return entries.length > 0 && campaign.rules.classes.enabled ? errorResponse(API_ERRORS.CLASS_REQUIRED, 422) : null;
  }

  if (entries.length === 0) return errorResponse(API_ERRORS.CONVERT_TO_CLASSES_FIRST, 422);

  const existing = entries.find((e) => e.classId === pick.classId);

  if (existing?.subclassId && pick.subclassId && pick.subclassId !== existing.subclassId) return errorResponse(API_ERRORS.SUBCLASS_ALREADY_SET, 422);

  const next = nextClassEntries(entries, { classId: pick.classId, subclassId: pick.subclassId });

  const applied = await applyClasses({
    campaignId: campaign.id,
    rules: campaign.rules,
    maxLevel: campaign.maxLevel,
    entries: next,
    spellcastingAbility: character.spellcastingAbility,
  });

  if (!applied.ok) return errorResponse(applied.error, applied.status, undefined, applied.params);

  const byId = applied.classesById;

  if (!existing && byId?.[pick.classId]) {
    const blocked = multiclassBlockedBy(entries.flatMap((e) => byId[e.classId] ?? []), byId[pick.classId], character);

    if (blocked) return errorResponse(API_ERRORS.MULTICLASS_REQUIREMENT, 422, undefined, { name: blocked });
  }

  const raised = next.find((e) => e.classId === pick.classId);

  const cls = applied.classesById?.[pick.classId];

  if (raised && cls && cls.subclassLevel !== null && raised.level >= cls.subclassLevel && !raised.subclassId && cls.subclasses.length > 0) {
    return errorResponse(API_ERRORS.SUBCLASS_REQUIRED, 422);
  }

  return applied.data;
}
