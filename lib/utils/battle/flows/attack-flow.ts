import type { AttackData } from "@/types/api";

export type AttackMode = "normal" | "advantage" | "disadvantage";

export type RollOutcome = "hit" | "crit" | "miss" | "critFail";

export interface Strike {
  targetId: string;
  d20?: number;
  second?: number;
  outcome?: RollOutcome;
  damage: number[];
}

export interface AttackOutcomeSummary {
  kind: "miss" | "hit" | "crit";
  targetId: string;
  damage: number;
  downed: boolean;
}

export interface AttackFlowState {
  step: "closed" | "weapon" | "target" | "roll" | "damage" | "summary" | "submitting" | "result";
  weaponCount: number;
  attackId?: string;
  maxTargets: number;
  diceSlots: number[];
  targetIds: string[];
  mode: AttackMode;
  strikes: Strike[];
  index: number;
  error?: string;
  results: AttackOutcomeSummary[];
}

export type AttackFlowAction =
  | { type: "OPEN"; weaponCount: number; attackId: string; maxTargets: number; diceSlots: number[] }
  | { type: "SELECT_WEAPON"; attackId: string; maxTargets: number; diceSlots: number[] }
  | { type: "TOGGLE_TARGET"; id: string }
  | { type: "SET_TARGETS"; ids: string[] }
  | { type: "CONFIRM_TARGETS" }
  | { type: "SET_MODE"; mode: AttackMode }
  | { type: "ROLL"; d20: number; second?: number; outcome: RollOutcome }
  | { type: "DAMAGE"; values: number[] }
  | { type: "BACK" }
  | { type: "SUBMIT" }
  | { type: "SUCCESS"; results: AttackOutcomeSummary[] }
  | { type: "FAIL"; error: string }
  | { type: "CLOSE" };

export const initialAttackFlow: AttackFlowState = {
  step: "closed", weaponCount: 0, maxTargets: 1, diceSlots: [], targetIds: [], mode: "normal", strikes: [], index: 0, results: [],
};

const isHit = (s: Strike) => s.outcome === "hit" || s.outcome === "crit";

const nextHit = (strikes: Strike[], from: number) => strikes.findIndex((s, i) => i >= from && isHit(s));

const prevHit = (strikes: Strike[], before: number) => {
  for (let i = before - 1; i >= 0; i -= 1) if (isHit(strikes[i])) return i;

  return -1;
};

export function attackFlow(s: AttackFlowState, a: AttackFlowAction): AttackFlowState {
  switch (a.type) {
    case "OPEN":
      return { ...initialAttackFlow, step: a.weaponCount > 1 ? "weapon" : "target", weaponCount: a.weaponCount, attackId: a.attackId, maxTargets: a.maxTargets, diceSlots: a.diceSlots };
    case "SELECT_WEAPON":
      return { ...s, step: "target", attackId: a.attackId, maxTargets: a.maxTargets, diceSlots: a.diceSlots, targetIds: s.targetIds.slice(0, a.maxTargets) };
    case "TOGGLE_TARGET": {
      if (s.maxTargets <= 1) return { ...s, targetIds: [a.id] };

      if (s.targetIds.includes(a.id)) return { ...s, targetIds: s.targetIds.filter((id) => id !== a.id) };

      return s.targetIds.length >= s.maxTargets ? s : { ...s, targetIds: [...s.targetIds, a.id] };
    }
    case "SET_TARGETS":
      return { ...s, targetIds: a.ids.slice(0, s.maxTargets) };
    case "CONFIRM_TARGETS":
      return s.targetIds.length === 0
        ? s
        : { ...s, step: "roll", index: 0, error: undefined, strikes: s.targetIds.map((targetId) => ({ targetId, damage: [] })) };
    case "SET_MODE":
      return { ...s, mode: a.mode };
    case "ROLL": {
      const strikes = s.strikes.map((st, i) => (i === s.index ? { ...st, d20: a.d20, second: a.second, outcome: a.outcome, damage: [] } : st));

      if (s.index + 1 < strikes.length) return { ...s, strikes, index: s.index + 1 };

      const first = nextHit(strikes, 0);

      return first === -1 ? { ...s, strikes, step: "submitting", error: undefined } : { ...s, strikes, step: "damage", index: first };
    }
    case "DAMAGE": {
      const strikes = s.strikes.map((st, i) => (i === s.index ? { ...st, damage: a.values } : st));

      const next = nextHit(strikes, s.index + 1);

      return next === -1 ? { ...s, strikes, step: "summary" } : { ...s, strikes, index: next };
    }
    case "BACK": {
      if (s.step === "summary") return { ...s, step: "damage", index: prevHit(s.strikes, s.strikes.length), error: undefined };

      if (s.step === "damage") {
        const prev = prevHit(s.strikes, s.index);

        return prev === -1 ? { ...s, step: "roll", index: s.strikes.length - 1 } : { ...s, index: prev };
      }

      if (s.step === "roll") return s.index > 0 ? { ...s, index: s.index - 1 } : { ...s, step: "target" };

      if (s.step === "target" && s.weaponCount > 1) return { ...s, step: "weapon" };

      return s;
    }
    case "SUBMIT":
      return s.step === "summary" ? { ...s, step: "submitting", error: undefined } : s;
    case "SUCCESS":
      return { ...s, step: "result", results: a.results, error: undefined };
    case "FAIL":
      return { ...s, step: s.strikes.some(isHit) ? "summary" : "roll", index: s.strikes.some(isHit) ? s.index : s.strikes.length - 1, error: a.error };
    case "CLOSE":
      return initialAttackFlow;
  }
}

export function effectiveD20(strike: Strike, mode: AttackMode): number {
  const d = strike.d20 ?? 0;

  if (strike.second === undefined || mode === "normal") return d;

  return mode === "advantage" ? Math.max(d, strike.second) : Math.min(d, strike.second);
}

export function attackPayload(s: AttackFlowState, attackerId: string): AttackData & { endTurn: boolean } {
  const base = { attackerId, attackId: s.attackId, endTurn: false };

  if (s.strikes.length === 1) {
    const [st] = s.strikes;

    return {
      ...base,
      targetIds: [st.targetId],
      attackRoll: st.d20,
      ...(st.second !== undefined && s.mode === "advantage" && { advantageRoll: st.second }),
      ...(st.second !== undefined && s.mode === "disadvantage" && { disadvantageRoll: st.second }),
      damageRolls: isHit(st) ? st.damage : [],
    } as AttackData & { endTurn: boolean };
  }

  const hits = s.strikes.filter(isHit);

  const used = hits.length ? hits : s.strikes;

  return {
    ...base,
    targetIds: used.map((st) => st.targetId),
    attackRolls: used.map((st) => effectiveD20(st, s.mode)),
    damageRolls: hits.flatMap((st) => st.damage),
  } as AttackData & { endTurn: boolean };
}
