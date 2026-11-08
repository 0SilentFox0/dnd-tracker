import { z } from "zod";

import { WFRP_CONDITION_KEYS, WFRP_CONDITION_MAX_LEVEL, type WfrpConditionKey } from "@/lib/constants/wfrp-conditions";

export const TABLE_SLOTS = ["critHead", "critArm", "critBody", "critLeg", "miscastMinor", "miscastMajor", "wrath", "downtimeEvent"] as const;

export type TableSlot = (typeof TABLE_SLOTS)[number];

export const MARKER_KEYS = ["winded", "disarmed", "crippled"] as const;

export type TableEffect =
  | { type: "damage"; amount: number }
  | { type: "wounds"; amount: number }
  | { type: "condition"; key: WfrpConditionKey; levels: number }
  | { type: "marker"; key: (typeof MARKER_KEYS)[number] };

export interface TableRow {
  max: number;
  text?: string;
  effects: TableEffect[];
}

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

export const SLOT_EFFECTS: Record<TableSlot, readonly TableEffect["type"][]> = {
  critHead: ["damage", "condition", "marker"],
  critArm: ["damage", "condition", "marker"],
  critBody: ["damage", "condition", "marker"],
  critLeg: ["damage", "condition", "marker"],
  miscastMinor: ["wounds", "condition"],
  miscastMajor: ["wounds", "condition"],
  wrath: ["wounds", "condition"],
  downtimeEvent: ["wounds", "condition"],
};

const slotRows = (slot: TableSlot) =>
  z
    .array(RowSchema)
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
