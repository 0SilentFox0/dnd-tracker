import { z } from "zod";

/**
 * Схема валідації для POST /spell.
 * Переходить з route.ts у власний модуль, щоб route.ts стала тонкою (CODE_AUDIT 1.3).
 */
export const spellSchema = z.object({
  casterId: z.string(), // ID BattleParticipant з initiativeOrder
  casterType: z.string().optional(), // опціонально для сумісності
  spellId: z.string(), // ID заклинання з бази даних
  targetIds: z.array(z.string()), // масив ID цілей
  damageRolls: z
    .array(z.union([z.number(), z.string()]))
    .default([])
    .transform((arr) =>
      arr
        .map((v) => (typeof v === "string" ? parseInt(v, 10) : v))
        .filter((n): n is number => Number.isFinite(n)),
    ), // результати кубиків (number або string → number[])
  savingThrows: z
    .array(
      z.object({
        participantId: z.string(),
        roll: z.number().min(1).max(20),
      }),
    )
    .optional(), // результати saving throws
  additionalRollResult: z.number().optional(), // результат додаткових кубиків
  hitRoll: z.number().min(1).max(20).optional(), // кидок попадання для заклинань з hitCheck
  preview: z.boolean().optional(), // true = повернути підрахунок без збереження в БД
});

export type SpellRequestData = z.infer<typeof spellSchema>;
