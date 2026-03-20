import { z } from "zod";

export const attackSchema = z
  .object({
    attackerId: z.string(),
    targetId: z.string().optional(),
    targetIds: z.array(z.string()).optional(),
    attackId: z.string().optional(),
    d20Roll: z.number().min(1).max(20).optional(),
    attackRoll: z.number().min(1).max(20).optional(),
    advantageRoll: z.number().min(1).max(20).optional(),
    disadvantageRoll: z.number().min(1).max(20).optional(),
    damageRolls: z.array(z.number()).default([]),
    reactionDamage: z.number().min(0).optional(),
  })
  .refine(
    (data) => data.d20Roll !== undefined || data.attackRoll !== undefined,
    {
      message: "d20Roll або attackRoll обов'язковий",
      path: ["d20Roll"],
    },
  )
  .refine(
    (data) =>
      data.targetId !== undefined ||
      (data.targetIds !== undefined && data.targetIds.length > 0),
    {
      message: "Потрібно вказати хоча б одну ціль",
      path: ["targetIds"],
    },
  );
