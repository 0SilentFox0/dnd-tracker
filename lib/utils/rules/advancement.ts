import { z } from "zod";

const BracketSchema = z.strictObject({ upTo: z.number().int().min(1).max(1000), cost: z.number().int().min(0).max(100000) });

const TrackSchema = z
  .strictObject({ brackets: z.array(BracketSchema).min(1).max(20), max: z.number().int().min(1).max(1000) })
  .refine((t) => t.brackets.every((b, i) => i === 0 || (b.upTo > t.brackets[i - 1].upTo && b.cost >= t.brackets[i - 1].cost)), { message: "rules.validation.advancementBrackets", path: ["brackets"] })
  .refine((t) => t.max >= t.brackets[t.brackets.length - 1].upTo, { message: "rules.validation.advancementMax", path: ["max"] });

export const AdvancementRulesSchema = z.strictObject({
  characteristic: TrackSchema,
  skill: TrackSchema,
  talentCostMultiplier: z.number().min(0).max(100),
});

export type AdvancementTrack = { brackets: { upTo: number; cost: number }[]; max: number };

export type AdvancementRules = { characteristic: AdvancementTrack; skill: AdvancementTrack; talentCostMultiplier: number };



// verify against 5e book: placeholder price tables
export const DEFAULT_ADVANCEMENT_RULES: AdvancementRules = {
  characteristic: {
    brackets: [
      { upTo: 5, cost: 25 },
      { upTo: 10, cost: 30 },
      { upTo: 15, cost: 40 },
      { upTo: 20, cost: 50 },
      { upTo: 25, cost: 70 },
      { upTo: 30, cost: 90 },
      { upTo: 35, cost: 120 },
      { upTo: 40, cost: 150 },
    ],
    max: 40,
  },
  skill: {
    brackets: [
      { upTo: 5, cost: 10 },
      { upTo: 10, cost: 15 },
      { upTo: 15, cost: 20 },
      { upTo: 20, cost: 30 },
      { upTo: 25, cost: 40 },
      { upTo: 30, cost: 60 },
    ],
    max: 30,
  },
  talentCostMultiplier: 1,
};
