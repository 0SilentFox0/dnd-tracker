/* eslint-disable no-restricted-syntax -- data: uk labels matched when importing content */
export const CHOICE_KINDS = ["option", "feat", "skill", "expertise", "abilityScore", "spell"] as const;

export const FEAT_TYPES = ["origin", "general", "fightingStyle", "epicBoon"] as const;

export const FEAT_TYPE_LABELS: Record<(typeof FEAT_TYPES)[number], string> = {
  origin: "Походження",
  general: "Загальна",
  fightingStyle: "Стиль бою",
  epicBoon: "Епічний дар",
};

export const CHOICE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const CHOICE_LIMITS = {
  choices: 20,
  options: 40,
  picks: 30,
  count: 30,
  points: 4,
  max: 30,
  requires: 10,
  optionSpells: 10,
  description: 4000,
  lists: 20,
  listLength: 40,
  characterFeats: 30,
  grantUses: 20,
} as const;
