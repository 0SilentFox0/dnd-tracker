import { z } from "zod";

import { CONDITION_SUBJECTS, type ConditionSubject, DAMAGE_KINDS, type DamageKind } from "./kinds";

export { CONDITION_SUBJECTS, type ConditionSubject } from "./kinds";

export type Condition =
  | { type: "hpBelow"; who: ConditionSubject; percent: number }
  | { type: "hpAbove"; who: ConditionSubject; percent: number }
  | { type: "attackKind"; kind: DamageKind }
  | { type: "targetHasCondition"; condition: string }
  | { type: "all"; conditions: Condition[] }
  | { type: "any"; conditions: Condition[] };

const subject = z.enum(CONDITION_SUBJECTS);

const percent = z.number().min(1).max(100);

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("hpBelow"), who: subject, percent }),
    z.object({ type: z.literal("hpAbove"), who: subject, percent }),
    z.object({ type: z.literal("attackKind"), kind: z.enum(DAMAGE_KINDS) }),
    z.object({ type: z.literal("targetHasCondition"), condition: z.string().min(1) }),
    z.object({ type: z.literal("all"), conditions: z.array(ConditionSchema).min(1) }),
    z.object({ type: z.literal("any"), conditions: z.array(ConditionSchema).min(1) }),
  ]),
);
