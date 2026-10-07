import { z } from "zod";

import { ConditionSchema } from "./conditions";
import { type Effect, EffectSchema, isBakedStat, isStaticEffect, TIMED_STATS } from "./effects";
import { isActionScopedTrigger, type Trigger, TriggerSchema } from "./triggers";

export const LimitsSchema = z.object({
  perBattle: z.number().int().min(1).optional(),
  perRound: z.number().int().min(1).optional(),
  perTurn: z.number().int().min(1).optional(),
  chance: z.number().min(1).max(100).optional(),
});

const PASSIVE_TARGETS = new Set(["self", "allAllies", "allEnemies"]);

function effectIssues(effect: Effect, trigger: Trigger, hasCondition: boolean): string[] {
  const issues: string[] = [];

  if (trigger.event === "passive") {
    if (effect.kind !== "note" && !isStaticEffect(effect)) {
      issues.push("Пасивка допускає лише modifyStat, damageBonus, flag, note");
    }

    if ("duration" in effect && effect.duration) issues.push("Пасивка діє постійно — без duration");

    if ("target" in effect && effect.target && !PASSIVE_TARGETS.has(effect.target)) {
      issues.push("Ціль пасивки: self, allAllies або allEnemies");
    }

    if (effect.kind === "modifyStat" && isBakedStat(effect.stat) && hasCondition) {
      issues.push(`${effect.stat} застосовується при побудові учасника — умова неможлива`);
    }

    return issues;
  }

  if (effect.kind === "modifyStat" && !(TIMED_STATS as readonly string[]).includes(effect.stat)) {
    issues.push(`${effect.stat} змінюється лише пасивкою`);
  }

  if (effect.kind === "modifyStat" && effect.stat === "morale" && !effect.duration) {
    issues.push("Тимчасова мораль потребує duration");
  }

  if (isStaticEffect(effect) && !effect.duration && !isActionScopedTrigger(trigger)) {
    issues.push("Потрібна duration (без неї — лише у фазі before)");
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
    description: z.string().optional(),
    trigger: TriggerSchema,
    condition: ConditionSchema.optional(),
    limits: LimitsSchema.optional(),
    effects: z.array(EffectSchema).min(1),
    stackable: z.boolean().optional(),
    maxStacks: z.number().int().min(1).optional(),
  })
  .superRefine((a, ctx) => {
    if (a.trigger.event === "passive" && a.limits) {
      ctx.addIssue({ code: "custom", path: ["limits"], message: "Пасивка без лімітів" });
    }

    if (a.maxStacks !== undefined && !a.stackable) {
      ctx.addIssue({ code: "custom", path: ["maxStacks"], message: "maxStacks має сенс лише зі stackable" });
    }

    a.effects.forEach((effect, i) => {
      for (const message of effectIssues(effect, a.trigger, a.condition !== undefined)) {
        ctx.addIssue({ code: "custom", path: ["effects", i], message });
      }
    });
  });

export const AbilitiesSchema = z.array(AbilitySchema);

export type Ability = z.infer<typeof AbilitySchema>;

export type Limits = z.infer<typeof LimitsSchema>;

export function parseAbilities(raw: unknown): Ability[] | null {
  if (raw === null || raw === undefined) return null;

  const parsed = AbilitiesSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}
