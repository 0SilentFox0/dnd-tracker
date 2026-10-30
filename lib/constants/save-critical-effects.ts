import type { CriticalEffect } from "@/lib/constants/critical-effects";

/** Нат. 20 на рятівному кидку цілі; `{attacker}` — кастер, `{target}` — ціль, що кидала. */
export const SAVE_SUCCESS_EFFECTS: CriticalEffect[] = [
  {
    id: 1,
    type: "success",
    flavorCount: 2,
    effect: { type: "negate_damage", target: "target" },
  },
  {
    id: 2,
    type: "success",
    flavorCount: 2,
    effect: { type: "advantage_next_attack", duration: 2, target: "target" },
  },
  {
    id: 3,
    type: "success",
    flavorCount: 2,
    effect: { type: "extra_action", target: "target" },
  },
  {
    id: 4,
    type: "success",
    flavorCount: 2,
    effect: { type: "ac_buff", value: 2, duration: 1, target: "target" },
  },
  {
    id: 5,
    type: "success",
    flavorCount: 2,
    effect: { type: "negate_effects", target: "target" },
  },
  {
    id: 6,
    type: "success",
    flavorCount: 2,
    effect: { type: "extra_action", target: "target" },
  },
];

/** Нат. 1 на рятівному кидку цілі. */
export const SAVE_FAIL_EFFECTS: CriticalEffect[] = [
  {
    id: 1,
    type: "fail",
    flavorCount: 2,
    effect: { type: "double_damage", value: 2, target: "target" },
  },
  {
    id: 2,
    type: "fail",
    flavorCount: 2,
    effect: { type: "prone", duration: 2, target: "target" },
  },
  {
    id: 3,
    type: "fail",
    flavorCount: 2,
    effect: { type: "disadvantage_next_attack", duration: 2, target: "target" },
  },
  {
    id: 4,
    type: "fail",
    flavorCount: 2,
    effect: { type: "ac_debuff", value: -2, duration: 1, target: "target" },
  },
  {
    id: 5,
    type: "fail",
    flavorCount: 2,
    effect: { type: "lose_reaction", duration: 1, target: "target" },
  },
  {
    id: 6,
    type: "fail",
    flavorCount: 2,
    effect: { type: "block_bonus_action", duration: 1, target: "target" },
  },
];
