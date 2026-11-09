import { z } from "zod";

import { CHARACTERISTIC_KEYS, type CharacteristicKey } from "@/lib/constants/wfrp-characteristics";
import { WFRP_CONDITION_KEYS, WFRP_CONDITION_MAX_LEVEL, type WfrpConditionKey } from "@/lib/constants/wfrp-conditions";
import { MUTATION_EFFECT_LIMITS, MUTATION_EFFECTS_MAX } from "@/lib/constants/wfrp-mutations";

export const TABLE_SLOTS = ["critHead", "critArm", "critBody", "critLeg", "miscastMinor", "miscastMajor", "wrath", "downtimeEvent", "mutationPhysical", "mutationMental"] as const;

export type TableSlot = (typeof TABLE_SLOTS)[number];

export const MUTATION_SLOTS = ["mutationPhysical", "mutationMental"] as const satisfies readonly TableSlot[];

export const MARKER_KEYS = ["winded", "disarmed", "crippled"] as const;

export type TableEffect =
  | { type: "damage"; amount: number }
  | { type: "wounds"; amount: number }
  | { type: "condition"; key: WfrpConditionKey; levels: number }
  | { type: "marker"; key: (typeof MARKER_KEYS)[number] }
  | { type: "characteristic"; key: CharacteristicKey; amount: number }
  | { type: "move"; amount: number }
  | { type: "maxWounds"; amount: number };

export type TableRow = {
  max: number;
  text?: string;
  effects: TableEffect[];
};

const amount = z.number().int().min(1).max(20);

const EffectSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("damage"), amount }),
  z.strictObject({ type: z.literal("wounds"), amount }),
  z.strictObject({ type: z.literal("condition"), key: z.enum(WFRP_CONDITION_KEYS), levels: z.number().int().min(1).max(WFRP_CONDITION_MAX_LEVEL) }),
  z.strictObject({ type: z.literal("marker"), key: z.enum(MARKER_KEYS) }),
]);

const RowSchema = z.strictObject({
  max: z.number().int().min(1).max(100),
  text: z.string().max(200).optional(),
  effects: z.array(EffectSchema).max(4),
});

const signed = (limit: number) =>
  z
    .number()
    .int()
    .min(-limit)
    .max(limit)
    .refine((n) => n !== 0);

const MutationEffectSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("characteristic"), key: z.enum(CHARACTERISTIC_KEYS), amount: signed(MUTATION_EFFECT_LIMITS.characteristic) }),
  z.strictObject({ type: z.literal("move"), amount: signed(MUTATION_EFFECT_LIMITS.move) }),
  z.strictObject({ type: z.literal("maxWounds"), amount: signed(MUTATION_EFFECT_LIMITS.maxWounds) }),
]);

const MutationRowSchema = z.strictObject({ max: RowSchema.shape.max, text: RowSchema.shape.text, effects: z.array(MutationEffectSchema).max(MUTATION_EFFECTS_MAX) });

const rowSchemaOf = (slot: TableSlot) => ((MUTATION_SLOTS as readonly string[]).includes(slot) ? MutationRowSchema : RowSchema) as z.ZodType<TableRow>;

export const SLOT_EFFECTS: Record<TableSlot, readonly TableEffect["type"][]> = {
  critHead: ["damage", "condition", "marker"],
  critArm: ["damage", "condition", "marker"],
  critBody: ["damage", "condition", "marker"],
  critLeg: ["damage", "condition", "marker"],
  miscastMinor: ["wounds", "condition"],
  miscastMajor: ["wounds", "condition"],
  wrath: ["wounds", "condition"],
  downtimeEvent: ["wounds", "condition"],
  mutationPhysical: ["characteristic", "move", "maxWounds"],
  mutationMental: ["characteristic", "move", "maxWounds"],
};

const slotRows = (slot: TableSlot) =>
  z
    .array(rowSchemaOf(slot))
    .min(1)
    .max(20)
    .superRefine((rows, ctx) => {
      if (rows.some((r, i) => i > 0 && r.max <= rows[i - 1].max)) ctx.addIssue({ code: "custom", message: "rules.validation.tablesOrder" });

      if (rows[rows.length - 1].max !== 100) ctx.addIssue({ code: "custom", message: "rules.validation.tablesLast" });

      if (rows.some((r) => r.effects.some((e) => !SLOT_EFFECTS[slot].includes(e.type)))) ctx.addIssue({ code: "custom", message: "rules.validation.tablesEffect" });
    })
    .nullable()
    .optional();

export const TablesRulesSchema = z.strictObject(Object.fromEntries(TABLE_SLOTS.map((s) => [s, slotRows(s)])) as Record<TableSlot, ReturnType<typeof slotRows>>);
