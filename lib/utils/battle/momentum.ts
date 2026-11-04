import type { ResolvedAttack } from "@/lib/utils/rules/systems/types";
import type { ParticipantSide, SceneMomentum } from "@/types/battle";

export const NO_MOMENTUM: SceneMomentum = Object.freeze({});

export const hasMomentum = (m: SceneMomentum): boolean => Object.keys(m).length > 0;

export const heldBy = (m: SceneMomentum, side: ParticipantSide): boolean => m[side] === true;

const sameMomentum = (a: SceneMomentum, b: SceneMomentum): boolean => Object.keys({ ...a, ...b }).every((k) => a[k as ParticipantSide] === b[k as ParticipantSide]);

export function settle(m: SceneMomentum, sides: { attacker: ParticipantSide; target: ParticipantSide }, resolved: ResolvedAttack["momentum"]): { next: SceneMomentum; gained: boolean } {
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

export const momentumPatch = (before: SceneMomentum, after: SceneMomentum): { momentum: SceneMomentum } | Record<string, never> => (sameMomentum(before, after) ? {} : { momentum: after });
