import type { AdvancementRules } from "./rules";

export function advanceCost(kind: "characteristic" | "skill", currentAdvances: number, rules: AdvancementRules): number | null {
  const track = rules[kind];

  if (currentAdvances >= track.max) return null;

  const bracket = track.brackets.find((b) => currentAdvances <= b.upTo) ?? track.brackets[track.brackets.length - 1];

  return bracket.cost;
}
