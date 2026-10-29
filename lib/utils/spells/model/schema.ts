import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { DurationSchema } from "@/lib/utils/abilities/schema/common";
import { BASE_EFFECTS, NonRandomEffectSchema, RandomOfSchema } from "@/lib/utils/abilities/schema/effects";
import { DICE_RE } from "@/lib/utils/abilities/schema/kinds";

export const SPELL_COSTS = ["action", "bonusAction", "reaction", "long"] as const;

export const SpellCastingTimeSchema = z.object({
  rounds: z.number().int().min(2).max(144000).optional(),
  text: z.string().trim().min(1).max(500).optional(),
  trigger: z.string().trim().min(1).max(1000).optional(),
});

export type SpellCastingTime = z.infer<typeof SpellCastingTimeSchema>;

export const SpellCostSchema = z.enum(SPELL_COSTS);

export const TEMPLATE_SHAPES = ["circle", "cube", "cone", "line", "cross", "emanation"] as const;

const rangeField = z.number().int().min(5).max(600).optional();

export const SpellZoneSchema = z.object({ rounds: z.number().int().min(1).max(10), label: z.string().max(60).optional() });

export const SpellTargetFilterSchema = z.object({
  creatureTypes: z.array(z.string().trim().min(1).max(40)).min(1).max(10).optional(),
  maxCr: z.number().min(0).max(30).optional(),
  maxCrPerLevel: z.number().min(0).max(5).optional(),
  movement: z.literal("fly").optional(),
});

const filterField = SpellTargetFilterSchema.optional();

export type SpellTargetFilter = z.infer<typeof SpellTargetFilterSchema>;

export const SpellTargetingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("self") }),
  z.object({ kind: z.literal("ally"), range: rangeField, filter: filterField }),
  z.object({ kind: z.literal("enemy"), range: rangeField, filter: filterField }),
  z.object({ kind: z.literal("allyDead"), range: rangeField }),
  z.object({ kind: z.literal("allAlliesDead") }),
  z.object({ kind: z.literal("area"), side: z.enum(["ally", "enemy"]), maxTargets: z.number().int().min(1).max(20), range: rangeField, chain: z.boolean().optional(), filter: filterField }),
  z.object({
    kind: z.literal("template"),
    shape: z.enum(TEMPLATE_SHAPES),
    size: z.number().int().min(5).max(120),
    side: z.enum(["ally", "enemy"]),
    maxTargets: z.number().int().min(1).max(20),
    range: rangeField,
    zone: SpellZoneSchema.optional(),
    hollow: z.boolean().optional(),
    exact: z.boolean().optional(),
    filter: filterField,
  }).refine((t) => t.exact === undefined || t.shape === "circle", { message: "Точна площа доступна лише для кола", path: ["exact"] }),
  z.object({ kind: z.literal("allAllies") }),
  z.object({ kind: z.literal("allEnemies") }),
  z.object({ kind: z.literal("everyone") }),
]);

export const SpellResolutionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("auto") }),
  z.object({ kind: z.literal("save"), ability: z.enum(ABILITY_KEYS), orAbility: z.enum(ABILITY_KEYS).optional(), onSuccess: z.enum(["half", "none"]) }),
  z.object({ kind: z.literal("attack") }),
]);

export const RaceModifierSchema = z.object({
  raceId: z.string().min(1),
  percent: z.number().min(-100).max(200),
});

export const SpellDiceSchema = z.number().int().min(0).max(40);

export const SpellDieSidesSchema = z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12), z.literal(20)]);

const ChooseOneSchema = z.object({ kind: z.literal("chooseOne"), options: z.array(NonRandomEffectSchema).min(2).max(7) });

/** Кубики заклинання = число з введення кастера (обрізане до max); у ефекти рушія не потрапляє. */
const InputDiceSchema = z.object({ kind: z.literal("inputDice"), label: z.string().trim().min(1).max(40), max: z.number().int().min(1).max(40) });

const attackNeedsEnemy = (d: { resolution: { kind: string }; targeting: { kind: string } }) => d.resolution.kind !== "attack" || d.targeting.kind === "enemy" || d.targeting.kind === "area";

const ATTACK_TARGET_ISSUE = { message: "Атака заклинанням — лише для цілі-ворога або області", path: ["resolution"] };

/** Вкладене визначення підкасту: `grantCast` у ньому неможливий, бо NonRandomEffect його не містить. */
export const InlineCastSchema = z.object({
  targeting: SpellTargetingSchema,
  resolution: SpellResolutionSchema,
  dice: z.number().int().min(0).max(40),
  dieSides: SpellDieSidesSchema.optional(),
  addAbilityMod: z.boolean().optional(),
  damageBonus: z.number().int().min(-20).max(40).optional(),
  effects: z.array(NonRandomEffectSchema).min(1).max(6),
  anchorMarkId: z.string().min(1).max(40).optional(),
  auto: z.object({ on: z.literal("attackAgainstMarked") }).optional(),
}).refine(attackNeedsEnemy, ATTACK_TARGET_ISSUE);

export const GRANT_CAST_COSTS = ["action", "bonusAction", "reaction"] as const;

/** Тимчасовий підкаст: носій (кастер або ціль) отримує окрему плитку з власним визначенням. */
const GrantCastSchema = z.object({
  kind: z.literal("grantCast"),
  label: z.string().trim().min(1).max(60),
  cost: z.enum(GRANT_CAST_COSTS),
  uses: z.number().int().min(1).max(20).optional(),
  duration: DurationSchema,
  target: z.enum(["self", "eventTarget"]).optional(),
  cast: InlineCastSchema,
});

/** Заряди додаткової шкоди на носії: кожне влучання (чи будь-яка атака) відповідного виду витрачає один заряд. */
const HitRiderSchema = z.object({
  kind: z.literal("hitRider"),
  attackKind: z.enum(["melee", "ranged", "any"]),
  extraDice: z.string().regex(DICE_RE),
  damageType: z.string().trim().min(1).max(30),
  charges: z.number().int().min(1).max(10),
  consumeOnMiss: z.boolean().optional(),
  save: z.object({ ability: z.enum(ABILITY_KEYS), onFail: z.array(NonRandomEffectSchema).min(1).max(3) }).optional(),
  expireAtTurnEnd: z.boolean().optional(),
  duration: DurationSchema,
  target: z.enum(["self", "eventTarget"]).optional(),
});

/** Кастер переміщується в найближчу вільну клітинку біля першої цілі; без атак при відході. */
const MoveSelfSchema = z.object({ kind: z.literal("moveSelf"), to: z.literal("adjacentToTarget") });

const SPELL_ONLY_EFFECTS = [ChooseOneSchema, InputDiceSchema, GrantCastSchema, HitRiderSchema, MoveSelfSchema] as const;

export const SpellEffectSchema = z.discriminatedUnion("kind", [...BASE_EFFECTS, RandomOfSchema, ...SPELL_ONLY_EFFECTS]);

export type SpellEffect = z.infer<typeof SpellEffectSchema>;

export type GrantCastEffect = z.infer<typeof GrantCastSchema>;

export type HitRiderEffect = z.infer<typeof HitRiderSchema>;

export type InlineCast = z.infer<typeof InlineCastSchema>;

export const SpellDefinitionSchema = z.object({
  executionMode: z.enum(["native", "manual"]).optional(),
  dice: SpellDiceSchema,
  cost: SpellCostSchema,
  casting: SpellCastingTimeSchema.optional(),
  targeting: SpellTargetingSchema,
  resolution: SpellResolutionSchema,
  effects: z.array(SpellEffectSchema),
  raceModifiers: z.array(RaceModifierSchema),
  stackable: z.boolean().optional(),
  maxStacks: z.number().int().min(1).max(10).optional(),
  concentration: z.boolean().optional(),
  dieSides: SpellDieSidesSchema.optional(),
  upcastDice: z.number().int().min(0).max(10).optional(),
  upcastTargets: z.number().int().min(0).max(10).optional(),
  addAbilityMod: z.boolean().optional(),
  fixedDice: z.boolean().optional(),
  damageBonus: z.number().int().min(-20).max(40).optional(),
}).refine(attackNeedsEnemy, ATTACK_TARGET_ISSUE);

export type SpellCost = z.infer<typeof SpellCostSchema>;

export type SpellTargeting = z.infer<typeof SpellTargetingSchema>;

export type SpellResolution = z.infer<typeof SpellResolutionSchema>;

export type RaceModifier = z.infer<typeof RaceModifierSchema>;

export type SpellDefinition = z.infer<typeof SpellDefinitionSchema>;
