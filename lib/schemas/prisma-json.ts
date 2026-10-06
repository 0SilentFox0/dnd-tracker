/**
 * Runtime-парсери для JSON-полів Prisma (CODE_AUDIT 3.1).
 *
 * Поля типу Json у Prisma не валідуються при читанні — у бізнес-логіку
 * тече `unknown` через `as unknown as Foo` cast (~20 місць).
 * Тут — Zod-схеми для найбільш чутливих JSON-колонок:
 *  - Skill.spellEnhancementData — апгрейди заклинань,
 *  - Character.skillTreeProgress — прогрес у дереві скілів,
 *  - Spell.effects (string[]) — список ефектів.
 *
 * Кожний парсер має `safeParseOrDefault` — повертає типізоване значення
 * або дефолт при invalid (з лог-викликом). Не throw'ає, бо часто
 * викликається в hot path і throw зламає весь request.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────
// Skill.spellEnhancementData
// ─────────────────────────────────────────────────────────────────────

export const skillSpellEnhancementDataSchema = z
  .object({
    spellEnhancementTypes: z.array(z.string()).optional(),
    spellEffectIncrease: z.number().nullable().optional(),
    spellTargetChange: z
      .object({ target: z.string() })
      .nullable()
      .optional(),
    spellAdditionalModifier: z
      .object({
        modifier: z.string().optional(),
        damageDice: z.string().optional(),
        duration: z.number().optional(),
      })
      .nullable()
      .optional(),
    spellNewSpellId: z.string().nullable().optional(),
    spellAllowMultipleTargets: z.boolean().optional(),
    spellAoeSpellIds: z.array(z.string()).optional(),
  })
  .passthrough();

export type SkillSpellEnhancementData = z.infer<
  typeof skillSpellEnhancementDataSchema
>;

// ─────────────────────────────────────────────────────────────────────
// Character.skillTreeProgress
// ─────────────────────────────────────────────────────────────────────

export const skillTreeProgressSchema = z.record(
  z.string(),
  z.object({
    level: z.enum(["basic", "advanced", "expert"]).optional(),
    unlockedSkills: z.array(z.string()).optional(),
  }),
);

export type SkillTreeProgress = z.infer<typeof skillTreeProgressSchema>;

// ─────────────────────────────────────────────────────────────────────
// Spell.effects
// ─────────────────────────────────────────────────────────────────────

export const spellEffectsListSchema = z.array(z.string());

export type SpellEffectsList = z.infer<typeof spellEffectsListSchema>;

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Парсить `unknown` через схему. На success повертає типізоване значення;
 * на failure логує + повертає `defaultValue`.
 *
 * Не throw — використовується в hot path (extract-skills, processSpell, тощо)
 * де throw зруйнував би request.
 */
export function safeParseOrDefault<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown,
  defaultValue: z.infer<TSchema>,
  context: { source: string; [key: string]: unknown },
): z.infer<TSchema> {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  console.warn(`[schema] safeParseOrDefault: invalid ${context.source}`, {
    ...context,
    issues: result.error.issues.slice(0, 5),
  });

  return defaultValue;
}
