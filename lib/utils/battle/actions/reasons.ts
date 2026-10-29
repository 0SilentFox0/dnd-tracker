import { textRef } from "@/lib/i18n/text-ref";
import type { TextArg, TextRef } from "@/types/text";

export const ACTION_REASONS = [
  "actionUsed",
  "bonusUsed",
  "targetMissing",
  "readiedMissing",
  "enemyRequired",
  "noAttack",
  "noSuchAttack",
  "attackUnavailable",
  "alreadyGrappled",
  "pushNeedsMap",
  "notProne",
  "standSpeedZero",
  "standNoMovement",
  "notGrappled",
  "noAdjacentAlly",
  "noAdjacentEnemy",
  "reactionUsed",
  "cannotReact",
  "cannotAct",
  "noLegendary",
  "legendaryOwnTurn",
  "legendaryShort",
  "dragNoMovement",
  "castDmOnly",
  "castNoRounds",
  "castPending",
  "castInterrupted",
  "castContinued",
  "castOverrun",
  "manualSpell",
] as const;

export type ActionReason = (typeof ACTION_REASONS)[number];

export const actionReason = (reason: ActionReason, params?: Record<string, TextArg>): TextRef => textRef(`battleActions.reject.${reason}`, params);
