import { z } from "zod";

import { ATTACK_KINDS } from "./kinds";

export { isActionScopedTrigger } from "./kinds";

const attackRole = z.enum(["attacker", "target"]);

const phase = z.enum(["before", "after"]);

export const TriggerSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("passive") }),
  z.object({ event: z.literal("battleStart") }),
  z.object({ event: z.literal("roundStart") }),
  z.object({ event: z.literal("roundEnd") }),
  z.object({ event: z.literal("turnStart") }),
  z.object({ event: z.literal("turnEnd") }),
  z.object({ event: z.literal("attack"), phase, role: attackRole, attackKind: z.enum(ATTACK_KINDS).optional() }),
  z.object({ event: z.literal("hit"), role: attackRole, whose: z.enum(["self", "ally"]).optional(), attackKind: z.enum(ATTACK_KINDS).optional() }),
  z.object({ event: z.literal("kill"), role: z.enum(["killer", "killerSide", "victimSide"]) }),
  z.object({ event: z.literal("lethalDamage") }),
  z.object({
    event: z.literal("spellCast"),
    phase,
    role: z.enum(["caster", "target"]),
    spellIds: z.array(z.string().min(1)).min(1).optional(),
    school: z.string().min(1).optional(),
    spellLevels: z.array(z.number().int().min(1).max(9)).min(1).optional(),
  }),
  z.object({
    event: z.literal("moraleCheck"),
    result: z.enum(["success", "fail", "any"]),
    whose: z.enum(["self", "ally"]),
  }),
  z.object({ event: z.literal("bonusAction") }),
  z.object({ event: z.literal("action") }),
]);

export type Trigger = z.infer<typeof TriggerSchema>;

export type TriggerEvent = Trigger["event"];
