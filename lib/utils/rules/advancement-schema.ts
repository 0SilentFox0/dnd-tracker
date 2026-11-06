import { z } from "zod";

export const FREE_POINT_MIN = 4;

export const FREE_POINT_MAX = 18;

const CHARACTERISTIC_COUNT = 10;

const FREE_BUDGET_MIN = FREE_POINT_MIN * CHARACTERISTIC_COUNT;

const FREE_BUDGET_MAX = FREE_POINT_MAX * CHARACTERISTIC_COUNT;

const BracketSchema = z.strictObject({ upTo: z.number().int().min(1).max(1000), cost: z.number().int().min(0).max(100000) });

const TrackSchema = z
  .strictObject({ brackets: z.array(BracketSchema).min(1).max(20), max: z.number().int().min(1).max(1000) })
  .refine((t) => t.brackets.every((b, i) => i === 0 || (b.upTo > t.brackets[i - 1].upTo && b.cost >= t.brackets[i - 1].cost)), { message: "rules.validation.advancementBrackets", path: ["brackets"] })
  .refine((t) => t.max >= t.brackets[t.brackets.length - 1].upTo, { message: "rules.validation.advancementMax", path: ["max"] });

const CareerRulesSchema = z.strictObject({
  ticksRequired: z.tuple([z.number().int().min(1).max(200), z.number().int().min(1).max(200), z.number().int().min(1).max(200)]),
  outOfCareerMultiplier: z.number().min(1).max(100),
});

const bonus = (n: number) => z.number().int().min(0).max(1000).default(n);

const CreationRulesSchema = z.strictObject({
  careerBonus: z.strictObject({ rolled: bonus(50), choice: bonus(25), free: bonus(0) }).prefault({}),
  statBonus: z.strictObject({ rolled: bonus(50), rearranged: bonus(25), free: bonus(0) }).prefault({}),
  freeBudget: z.number().int().min(FREE_BUDGET_MIN).max(FREE_BUDGET_MAX).default(100),
});

export const AdvancementRulesSchema = z.strictObject({
  characteristic: TrackSchema,
  skill: TrackSchema,
  talentCostMultiplier: z.number().min(0).max(100),
  career: CareerRulesSchema,
  creation: CreationRulesSchema.prefault({}),
});
