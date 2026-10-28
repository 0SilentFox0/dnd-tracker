import { z } from "zod";

/** Exact operation ids from the shared HTTP registry, including legendary via core-action. */
export const BATTLE_COMMANDS = ["ability-action", "add-participant", "attack", "aura-zone", "bonus-action", "complete", "conditions", "core-action", "map-terrain", "map-weather", "maze", "maze-mark", "morale-check", "move", "next-turn", "participants.patch", "refresh-sources", "reset", "reveal-participant", "rollback", "scale-units", "spell", "start", "unit-control"] as const;
export const BATTLE_RECORD_WRITES = ["create", "patch", "delete", "clear-history", "audio"] as const;
export const BATTLE_READS = ["list", "active", "get", "version", "summary", "events", "balance.get", "balance", "audio.get"] as const;
export const battleActionInput = z.object({
  battleId: z.string().min(1).optional(),
  body: z.record(z.string(), z.unknown()).default({}),
  dice: z.enum(["server", "manual"]).default("server"),
}).strict();
export type BattleActionInput = z.infer<typeof battleActionInput>;
export const HUMAN_BATTLE_ACTIONS = new Set(["delete", "clear-history", "reset", "rollback"]);
