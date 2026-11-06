import { z } from "zod";

import { CHARACTERISTIC_KEYS, type CharacteristicKey, LEDGER_MAX, SKILL_ADVANCE_KEY_RE } from "./keys";

export { type CareerState, CHARACTERISTIC_KEYS, type CharacteristicKey, type Characteristics, DEFAULT_CHARACTERISTICS, LEDGER_MAX, type LedgerEntry, readCharacteristics, SKILL_ADVANCE_KEY_RE, SKILL_KEY_RE, SPEC_RE } from "./keys";

const perKey = (min: number, max: number, fill: number) =>
  z
    .partialRecord(z.enum(CHARACTERISTIC_KEYS), z.number().int().min(min).max(max))
    .default({})
    .transform((partial) => ({ ...Object.fromEntries(CHARACTERISTIC_KEYS.map((k) => [k, fill])), ...partial }) as Record<CharacteristicKey, number>);

const LedgerEntrySchema = z.object({
  id: z.string().min(1).max(64),
  at: z.string().min(1).max(40),
  kind: z.enum(["characteristic", "skill", "talent"]),
  key: z.string().min(1).max(80),
  from: z.number().int().min(0).max(1e6),
  to: z.number().int().min(0).max(1e6),
  cost: z.number().int().min(0).max(1e9),
  tick: z.string().min(1).max(100).optional(),
});

export const CareerStateSchema = z.object({
  careerId: z.string().min(1).max(64),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  ticks: z
    .array(z.string().min(1).max(100))
    .max(LEDGER_MAX)
    .refine((t) => new Set(t).size === t.length),
});

export const CharacteristicsSchema = z.object({
  base: perKey(1, 100, 30),
  advances: perKey(0, 100, 0),
  move: z.number().int().min(1).max(12).default(4),
  skillAdvances: z.record(z.string().regex(SKILL_ADVANCE_KEY_RE), z.number().int().min(0).max(100)).default({}),
  fate: z.number().int().min(0).max(9).default(0),
  extraWounds: z.number().int().min(0).max(3).default(0),
  talents: z.record(z.string().min(1), z.number().int().min(1).max(20)).default({}),
  ledger: z.array(LedgerEntrySchema).max(LEDGER_MAX).default([]),
  spentArchived: z.number().int().min(0).max(1e9).default(0),
  career: CareerStateSchema.optional(),
});
