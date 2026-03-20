import { z } from "zod";

/** Схема для згрупованої структури створення скіла */
export const createSkillSchema = z.object({
  basicInfo: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional(),
    ),
  }),
  bonuses: z.record(z.string(), z.number()).default({}),
  combatStats: z.object({
    damage: z.number().optional(),
    armor: z.number().optional(),
    speed: z.number().optional(),
    physicalResistance: z.number().optional(),
    magicalResistance: z.number().optional(),
    min_targets: z.number().optional(),
    max_targets: z.number().optional(),
    affectsDamage: z.boolean().optional(),
    damageType: z.enum(["melee", "ranged", "magic"]).nullable().optional(),
    effects: z
      .array(
        z.object({
          stat: z.string(),
          type: z.string(),
          value: z.union([z.number(), z.string(), z.boolean()]),
          isPercentage: z.boolean().optional(),
          duration: z.number().optional(),
          target: z
            .enum(["self", "enemy", "all_enemies", "all_allies"])
            .optional(),
          maxTriggers: z.number().min(1).max(100).nullable().optional(),
        }),
      )
      .optional(),
  }),
  spellData: z.object({
    spellId: z.string().optional(),
    spellGroupId: z.string().optional(),
    grantedSpellId: z.string().nullable().optional(),
  }),
  spellEnhancementData: z.object({
    spellEnhancementTypes: z
      .array(
        z.enum([
          "effect_increase",
          "target_change",
          "additional_modifier",
          "new_spell",
        ]),
      )
      .optional(),
    spellEffectIncrease: z.number().min(0).max(200).optional(),
    spellTargetChange: z
      .object({
        target: z.enum(["enemies", "allies", "all"]),
      })
      .optional(),
    spellAdditionalModifier: z
      .object({
        modifier: z.string().optional(),
        damageDice: z.string().optional(),
        duration: z.number().optional(),
      })
      .optional(),
    spellNewSpellId: z.string().optional(),
  }),
  mainSkillData: z.object({
    mainSkillId: z.string().optional(),
  }),
  image: z.string().nullable().optional(),
  skillTriggers: z
    .array(
      z.union([
        z.object({
          type: z.literal("simple"),
          trigger: z.enum([
            "startRound",
            "endRound",
            "beforeOwnerAttack",
            "beforeEnemyAttack",
            "afterOwnerAttack",
            "afterEnemyAttack",
            "beforeOwnerSpellCast",
            "afterOwnerSpellCast",
            "beforeEnemySpellCast",
            "afterEnemySpellCast",
            "bonusAction",
            "passive",
            "onBattleStart",
            "onHit",
            "onAttack",
            "onKill",
            "onAllyDeath",
            "onLethalDamage",
            "onCast",
            "onFirstHitTakenPerRound",
            "onFirstRangedAttack",
            "onMoraleSuccess",
            "allyMoraleCheck",
          ]),
          modifiers: z.object({
            probability: z.number().optional(),
            oncePerBattle: z.boolean().optional(),
            twicePerBattle: z.boolean().optional(),
            stackable: z.boolean().optional(),
            condition: z.string().optional(),
            attackId: z.string().optional(),
            responseType: z.enum(["melee", "ranged", "magic"]).optional(),
          }).optional(),
        }),
        z.object({
          type: z.literal("complex"),
          target: z.enum(["ally", "enemy", "self"]),
          operator: z.enum([">", "<", "=", "<=", ">="]),
          value: z.number(),
          valueType: z.enum(["number", "percent"]),
          stat: z.enum(["HP", "Attack", "AC", "Speed", "Morale", "Level"]),
          modifiers: z.object({
            probability: z.number().optional(),
            oncePerBattle: z.boolean().optional(),
            twicePerBattle: z.boolean().optional(),
            stackable: z.boolean().optional(),
            condition: z.string().optional(),
            attackId: z.string().optional(),
            responseType: z.enum(["melee", "ranged", "magic"]).optional(),
          }).optional(),
        }),
      ]),
    )
    .default([])
    .optional(),
});
