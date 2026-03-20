import { z } from "zod";

/** Схема для згрупованої структури (всі поля опціональні для оновлення) */
export const updateSkillSchema = z.object({
  basicInfo: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      icon: z.preprocess(
        (val) => (val === "" ? null : val),
        z.string().url().nullable().optional(),
      ),
    })
    .optional(),
  bonuses: z.record(z.string(), z.number()).optional(),
  combatStats: z
    .object({
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
    })
    .optional(),
  spellData: z
    .object({
      spellId: z.string().nullable().optional(),
      spellGroupId: z.string().nullable().optional(),
      grantedSpellId: z.string().nullable().optional(),
    })
    .optional(),
  spellEnhancementData: z
    .object({
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
      spellEffectIncrease: z.number().min(0).max(200).optional().nullable(),
      spellTargetChange: z
        .object({
          target: z.enum(["enemies", "allies", "all"]),
        })
        .optional()
        .nullable(),
      spellAdditionalModifier: z
        .object({
          modifier: z.string().optional(),
          damageDice: z.string().optional(),
          duration: z.number().optional(),
        })
        .optional()
        .nullable(),
      spellNewSpellId: z.string().nullable().optional(),
    })
    .optional(),
  mainSkillData: z
    .object({
      mainSkillId: z.string().nullable().optional(),
    })
    .optional(),
  image: z.string().nullable().optional(),
  appearanceDescription: z.string().nullable().optional(),
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
    .optional(),
});
