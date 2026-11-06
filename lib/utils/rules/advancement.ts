export const FREE_POINT_MIN = 4;

export const FREE_POINT_MAX = 18;

export type AdvancementTrack = { brackets: { upTo: number; cost: number }[]; max: number };

export type CareerRules = { ticksRequired: [number, number, number]; outOfCareerMultiplier: number };

export type CreationRules = {
  careerBonus: { rolled: number; choice: number; free: number };
  statBonus: { rolled: number; rearranged: number; free: number };
  freeBudget: number;
};

export type AdvancementRules = { characteristic: AdvancementTrack; skill: AdvancementTrack; talentCostMultiplier: number; career: CareerRules; creation: CreationRules };

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
  // verify against 5e book
  career: { ticksRequired: [10, 12, 14], outOfCareerMultiplier: 2 },
  // verify against 5e book
  creation: { careerBonus: { rolled: 50, choice: 25, free: 0 }, statBonus: { rolled: 50, rearranged: 25, free: 0 }, freeBudget: 100 },
};
