import { z } from "zod";

import { ATTACK_KINDS } from "./common";

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
  z.object({ event: z.literal("hit"), role: attackRole, attackKind: z.enum(ATTACK_KINDS).optional() }),
  z.object({ event: z.literal("kill"), role: z.enum(["killer", "killerSide", "victimSide"]) }),
  z.object({ event: z.literal("lethalDamage") }),
  z.object({ event: z.literal("spellCast"), phase, role: z.enum(["caster", "target"]) }),
  z.object({
    event: z.literal("moraleCheck"),
    result: z.enum(["success", "fail", "any"]),
    whose: z.enum(["self", "ally"]),
  }),
  z.object({ event: z.literal("bonusAction") }),
]);

export type Trigger = z.infer<typeof TriggerSchema>;

export type TriggerEvent = Trigger["event"];

export function isActionScopedTrigger(t: Trigger): boolean {
  return (t.event === "attack" || t.event === "spellCast") && t.phase === "before";
}
