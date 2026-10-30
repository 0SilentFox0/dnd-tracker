import { z } from "zod";

import { FormulaSchema, ScaleSchema } from "./common";
import { ConditionSchema } from "./conditions";
import { type Effect, EffectSchema, isBakedStat, isStaticEffect, TIMED_STATS } from "./effects";
import { isAreaTarget, PASSIVE_TARGETS } from "./kinds";
import { AbilityParamsSchema } from "./params";
import { isStaticCondition } from "./static-condition";
import { isActionScopedTrigger, type Trigger, TriggerSchema } from "./triggers";

import type { ErrorParams } from "@/lib/constants/api-errors";
import { CLASS_COLUMN_KEY_RE } from "@/lib/constants/classes";

export const LimitsSchema = z.object({
  perBattle: z.number().int().min(1).optional(),
  perRound: z.number().int().min(1).optional(),
  perTurn: z.number().int().min(1).optional(),
  perRest: z.object({ rest: z.enum(["short", "long"]), uses: z.union([z.number().int().min(1), FormulaSchema, ScaleSchema]), shortRegain: z.number().int().min(1).optional() }).optional(),
  cooldownRounds: z.number().int().min(1).optional(),
  chance: z.number().min(1).max(100).optional(),
  lair: z.literal(true).optional(),
  legendaryCost: z.number().int().min(1).max(3).optional(),
  pool: z.object({ key: z.string().regex(CLASS_COLUMN_KEY_RE).max(40), cost: z.number().int().min(1).max(20) }).optional(),
});

type EffectIssue = { message: string; params?: ErrorParams };

function effectIssues(effect: Effect, trigger: Trigger, hasCondition: boolean): EffectIssue[] {
  const issues: EffectIssue[] = [];

  if (trigger.event === "passive") {
    if (effect.kind !== "note" && effect.kind !== "restoreSpellSlotLevels" && !isStaticEffect(effect)) {
      issues.push({ message: "abilities.validation.passiveEffectKinds" });
    }

    if ("duration" in effect && effect.duration) issues.push({ message: "abilities.validation.passiveNoDuration" });

    if ("target" in effect && effect.target && !PASSIVE_TARGETS.has(effect.target)) {
      issues.push({ message: "abilities.validation.passiveTarget" });
    }

    if (effect.kind === "modifyStat" && isBakedStat(effect.stat) && effect.stat !== "morale" && isAreaTarget(effect.target)) {
      issues.push({ message: "abilities.validation.bakedStatArea", params: { stat: effect.stat } });
    }

    if (effect.kind === "modifyStat" && isBakedStat(effect.stat) && hasCondition) {
      issues.push({ message: "abilities.validation.bakedStatCondition", params: { stat: effect.stat } });
    }

    return issues;
  }

  if ("target" in effect && isAreaTarget(effect.target)) {
    issues.push({ message: "abilities.validation.areaOnlyPassive" });
  }

  if (effect.kind === "modifyStat" && !(TIMED_STATS as readonly string[]).includes(effect.stat)) {
    issues.push({ message: "abilities.validation.statPassiveOnly", params: { stat: effect.stat } });
  }

  if (effect.kind === "maneuver" && trigger.event !== "bonusAction" && trigger.event !== "action") {
    issues.push({ message: "abilities.validation.maneuverTrigger" });
  }

  if (effect.kind === "summon" && trigger.event !== "bonusAction" && trigger.event !== "action" && trigger.event !== "kill") {
    issues.push({ message: "abilities.validation.summonTrigger" });
  }

  if (effect.kind === "modifyStat" && effect.stat === "morale" && !effect.duration) {
    issues.push({ message: "abilities.validation.moraleNeedsDuration" });
  }

  if (isStaticEffect(effect) && !effect.duration && !isActionScopedTrigger(trigger)) {
    issues.push({ message: "abilities.validation.durationRequired" });
  }

  if (effect.kind === "randomOf") {
    for (const option of effect.options) issues.push(...effectIssues(option, trigger, hasCondition));
  }

  return issues;
}

export const AbilitySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    icon: z.preprocess((v) => (v === "" ? null : v), z.string().max(2000).refine((v) => !v.startsWith("data:"), "abilities.validation.iconLink").nullable().optional()),
    description: z.string().optional(),
    trigger: TriggerSchema,
    condition: ConditionSchema.optional(),
    limits: LimitsSchema.optional(),
    perform: z.discriminatedUnion("kind", [z.object({ kind: z.literal("attack"), attack: z.string().min(1) }).strict(), z.object({ kind: z.literal("spell"), spellId: z.string().min(1) }).strict()]).optional(),
    effects: z.array(EffectSchema).min(1),
    stackable: z.boolean().optional(),
    maxStacks: z.number().int().min(1).optional(),
    maxTargets: z.number().int().min(1).optional(),
    params: AbilityParamsSchema.optional(),
    aim: z.object({ kind: z.enum(["cell", "direction"]), range: z.number().int().min(5) }).optional(),
  })
  .superRefine((a, ctx) => {
    if (a.trigger.event === "passive" && a.limits) {
      ctx.addIssue({ code: "custom", path: ["limits"], message: "abilities.validation.passiveNoLimits" });
    }

    if (a.maxStacks !== undefined && !a.stackable) {
      ctx.addIssue({ code: "custom", path: ["maxStacks"], message: "abilities.validation.maxStacksNeedsStackable" });
    }

    if (a.maxTargets !== undefined && a.trigger.event !== "bonusAction" && a.trigger.event !== "action") {
      ctx.addIssue({ code: "custom", path: ["maxTargets"], message: "abilities.validation.maxTargetsTrigger" });
    }

    if (a.limits?.legendaryCost !== undefined && (a.trigger.event !== "action" || a.aim)) {
      ctx.addIssue({ code: "custom", path: ["limits", "legendaryCost"], message: "abilities.validation.legendaryAction" });
    }

    if (a.limits?.lair && (a.trigger.event !== "action" || a.limits.legendaryCost !== undefined || a.aim)) {
      ctx.addIssue({ code: "custom", path: ["limits", "lair"], message: "abilities.validation.lairAction" });
    }

    if (a.perform && (!a.limits?.legendaryCost && !a.limits?.lair || a.effects.some((e) => e.kind !== "note"))) {
      ctx.addIssue({ code: "custom", path: ["perform"], message: "abilities.validation.perform" });
    }

    if (a.params?.sneakAttack && (a.trigger.event !== "hit" || !a.effects.some((e) => e.kind === "dealDamage"))) {
      ctx.addIssue({ code: "custom", path: ["params", "sneakAttack"], message: "abilities.validation.sneakAttack" });
    }

    if (a.params?.cunningStrike && a.trigger.event !== "passive") {
      ctx.addIssue({ code: "custom", path: ["params", "cunningStrike"], message: "abilities.validation.cunningStrike" });
    }

    if (a.aim && a.trigger.event !== "bonusAction" && a.trigger.event !== "action") {
      ctx.addIssue({ code: "custom", path: ["aim"], message: "abilities.validation.aimTrigger" });
    }

    a.effects.forEach((effect, i) => {
      for (const issue of effectIssues(effect, a.trigger, a.condition !== undefined && !isStaticCondition(a.condition))) {
        ctx.addIssue({ code: "custom", path: ["effects", i], ...issue });
      }
    });
  })
  .describe("Ability: trigger (when), condition (if), effects (what), limits. Passives allow only static effects without duration.");

export const AbilitiesSchema = z.array(AbilitySchema);

export type Ability = z.infer<typeof AbilitySchema>;

export type Limits = z.infer<typeof LimitsSchema>;

export function parseAbilities(raw: unknown): Ability[] | null {
  if (raw === null || raw === undefined) return null;

  const parsed = AbilitiesSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}
