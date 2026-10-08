/**
 * Runtime-парсери для JSON-полів Prisma, які не валідуються при читанні (Character.skillTreeProgress). `safeParseOrDefault` повертає дефолт з логом і не кидає:
 * його викликають у hot path, де throw зламав би весь request.
 */

import { z } from "zod";

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
// Helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Парсить `unknown` через схему. На success повертає типізоване значення;
 * на failure логує + повертає `defaultValue`.
 *
 * Не throw — використовується в hot path (extract-skills, тощо)
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
