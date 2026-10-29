import type { Ruleset } from "./schema";

export const DEFAULT_RULES: Ruleset = {
  morale: { enabled: true, cap: 3 },
  criticals: { critOn: 20, fumbleOn: 1, effects: true, doubleDice: false, disabledSuccess: [], disabledFail: [] },
  formulas: { saveDcBase: 8, proficiencyBase: 2, proficiencyEvery: 4 },
  heroScaling: { meleeDiceByLevel: null, rangedDiceByLevel: null, hpBaseLevels: 3, hpConCoefficient: 1.5 },
  initiative: { heroMin: 10, heroMax: 16, mode: "static" },
  // eslint-disable-next-line no-restricted-syntax -- default attack names stored in campaign rules
  defaultAttacks: { meleeName: "Звичайний удар", rangedName: "Звичайний постріл" },
  saves: { proficiency: false },
  deathSaves: { enabled: false, unitsDieAtZero: true },
  concentration: { enabled: false, dcCap: null },
  conditions: { enabled: false, exhaustion: "2014" },
  actions: { enabled: false, opportunityAttacks: true, retaliation: true, variant: "2014" },
  classes: { enabled: false },
  outOfCombat: { persistResources: false, longRestHitDice: "half", xp: false, inspiration: false },
  encounters: { balance: "fair", edition: "2014", autoXp: false },
  items: { enabled: false, attunementLimit: 3 },
};
