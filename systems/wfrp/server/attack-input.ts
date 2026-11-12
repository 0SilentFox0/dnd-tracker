import { z } from "zod";

import { FORTUNE_INPUT } from "../rules/percentile/fortune";

import type { SystemSlot } from "@/lib/utils/rules/systems/slot";

const roll = z.number().int().min(1).max(100);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// one release: the flat `fortune`/`fortuneRoll` request shape still maps onto `system`/`secondRoll`
const fromLegacy = (raw: unknown): unknown => {
  if (!isRecord(raw) || raw.system !== undefined || raw.fortune === undefined) return raw;

  return { ...raw, system: { key: "wfrp", data: { kind: raw.fortune } }, secondRoll: raw.secondRoll ?? raw.fortuneRoll };
};

const Body = z.object({
  system: z.object({ key: z.literal("wfrp"), data: z.object({ kind: z.enum(["reroll", "sl"]), manualReroll: roll.optional() }) }).optional(),
  secondRoll: roll.optional(),
});

export const WfrpFortuneInputSchema = z.preprocess(fromLegacy, Body).transform(({ system, secondRoll }): SystemSlot | undefined => {
  if (!system) return undefined;

  const { kind, manualReroll } = system.data;

  return FORTUNE_INPUT.write({ kind, ...(kind === "reroll" && (secondRoll ?? manualReroll) !== undefined && { manualReroll: secondRoll ?? manualReroll }) });
});
