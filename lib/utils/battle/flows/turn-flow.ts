import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";

export type MoraleOutcome = "extra" | "skip" | "none";

export function moraleOutcome(r: Pick<MoraleCheckResult, "hasExtraTurn" | "shouldSkipTurn"> | null | undefined): MoraleOutcome {
  return r?.hasExtraTurn ? "extra" : r?.shouldSkipTurn ? "skip" : "none";
}

export interface TurnFlowState {
  phase: "waiting" | "morale" | "acting" | "countdown" | "ended";
  stayed: boolean;
  moraleResult?: MoraleOutcome;
}

export type TurnFlowAction =
  | { type: "BEGIN"; needsMorale: boolean }
  | { type: "MORALE_RESULT"; result: MoraleOutcome }
  | { type: "EXHAUSTED" }
  | { type: "STAY" }
  | { type: "END" }
  | { type: "RECOVER" };

export const initialTurnFlow: TurnFlowState = { phase: "waiting", stayed: false };

export const COUNTDOWN_SECONDS = 5;

export const MORALE_SKIP_MS = 4_000;

export function turnFlow(s: TurnFlowState, a: TurnFlowAction): TurnFlowState {
  switch (a.type) {
    case "BEGIN":
      return { phase: a.needsMorale ? "morale" : "acting", stayed: false };
    case "MORALE_RESULT":
      return s.phase === "morale" ? { ...s, phase: a.result === "skip" ? "ended" : "acting", moraleResult: a.result } : s;
    case "EXHAUSTED":
      return s.phase === "acting" && !s.stayed ? { ...s, phase: "countdown" } : s;
    case "STAY":
      return s.phase === "countdown" ? { ...s, phase: "acting", stayed: true } : s;
    case "END":
      return { ...s, phase: "ended" };
    case "RECOVER":
      return s.phase === "ended" ? { ...s, phase: "acting", stayed: true } : s;
  }
}
