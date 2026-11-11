import type { SceneMomentum } from "../slots";

import type { ParticipantSide } from "@/types/battle";

export const heldBy = (m: SceneMomentum, side: ParticipantSide): boolean => m[side] === true;

export function settle(m: SceneMomentum, sides: { attacker: ParticipantSide; target: ParticipantSide }, resolved: { spent: boolean; gainedBy: "attacker" | "defender" | null }): { next: SceneMomentum; gained: boolean } {
  const { attacker, target } = sides;

  const heldAttacker = heldBy(m, attacker);

  const heldDefender = heldBy(m, target);

  let next: SceneMomentum = { ...m };

  if (resolved.spent) delete next[attacker];

  if (heldDefender) delete next[target];

  if (!resolved.gainedBy) return { next, gained: false };

  const winner = resolved.gainedBy === "attacker" ? attacker : target;

  next = { [winner]: true };

  return { next, gained: !(winner === attacker ? heldAttacker : heldDefender) };
}
