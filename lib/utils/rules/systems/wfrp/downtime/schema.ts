import { z } from "zod";

import { CHARACTERISTIC_KEYS, SKILL_ADVANCE_KEY_RE, SPEC_RE } from "../characteristics/constants";

const TrainParamsSchema = z
  .strictObject({ kind: z.enum(["characteristic", "skill"]), key: z.string().min(1).max(80) })
  .superRefine((p, ctx) => {
    const ok = p.kind === "characteristic" ? (CHARACTERISTIC_KEYS as readonly string[]).includes(p.key) : SKILL_ADVANCE_KEY_RE.test(p.key);

    if (!ok) ctx.addIssue({ code: "custom", path: ["key"], message: "invalid key" });
  });

export const EndeavourSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("earn"), params: z.union([z.strictObject({ skill: z.literal("trade"), spec: z.string().regex(SPEC_RE) }), z.strictObject({ skill: z.literal("charm") })]) }),
  z.strictObject({ kind: z.literal("train"), params: TrainParamsSchema }),
  z.strictObject({ kind: z.literal("tend"), params: z.strictObject({ patientId: z.string().min(1).max(64) }) }),
  z.strictObject({ kind: z.literal("rest"), params: z.strictObject({}) }),
  z.strictObject({ kind: z.literal("custom"), params: z.strictObject({ text: z.string().min(1).max(200) }) }),
]);

export const AilmentInputSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  kind: z.enum(["festering", "disease", "injury"]),
  daysLeft: z.number().int().min(1).max(365),
  label: z.string().trim().min(1).max(80),
});
