import type { PredictedAttack } from "@/lib/utils/battle/attack/bonus";
import type { AttackData } from "@/types/api";

export type AttackMode = "normal" | "advantage" | "disadvantage";

export type RollOutcome = "hit" | "crit" | "miss" | "critFail";

/** Режим, який задають навички/ефекти (зокрема взаємне скасування) — гравець його не змінює */
export interface ForcedMode {
  mode: AttackMode;
  reason: string;
}

export interface Strike {
  targetId: string;
  forced?: ForcedMode;
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
  obstacle: boolean;
  strikes: Strike[];
  index: number;
  error?: string;
  results: AttackOutcomeSummary[];
  /** Зброю й ціль вибрано кліком по карті чи списку — майстер одразу на кидку */
  picked?: boolean;
}

export type AttackFlowAction =
  | { type: "OPEN"; weaponCount: number; attackId: string; maxTargets: number; diceSlots: number[]; targetIds?: string[]; picked?: boolean }
  | { type: "SELECT_WEAPON"; attackId: string; maxTargets: number; diceSlots: number[] }
  | { type: "CHANGE_WEAPON" }
  | { type: "TOGGLE_TARGET"; id: string }
  | { type: "SET_TARGETS"; ids: string[] }
  | { type: "CONFIRM_TARGETS"; forced?: Record<string, ForcedMode | undefined> }
  | { type: "SET_MODE"; mode: AttackMode }
  | { type: "TOGGLE_OBSTACLE" }
  | { type: "ROLL"; d20: number; second?: number; outcome: RollOutcome }
  | { type: "DAMAGE"; values: number[] }
  | { type: "BACK" }
  | { type: "SUBMIT" }
  | { type: "SUCCESS"; results: AttackOutcomeSummary[] }
  | { type: "FAIL"; error: string }
  | { type: "CLOSE" };

export const initialAttackFlow: AttackFlowState = {
  step: "closed", weaponCount: 0, maxTargets: 1, diceSlots: [], targetIds: [], mode: "normal", obstacle: false, strikes: [], index: 0, results: [],
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
      return { ...initialAttackFlow, step: a.weaponCount > 1 ? "weapon" : "target", weaponCount: a.weaponCount, attackId: a.attackId, maxTargets: a.maxTargets, diceSlots: a.diceSlots, targetIds: (a.targetIds ?? []).slice(0, a.maxTargets), ...(a.picked && { picked: true }) };
    case "SELECT_WEAPON":
      return { ...s, step: "target", attackId: a.attackId, maxTargets: a.maxTargets, diceSlots: a.diceSlots, targetIds: s.targetIds.slice(0, a.maxTargets) };
    case "CHANGE_WEAPON":
      return s.weaponCount > 1 && s.step === "roll" ? { ...s, step: "weapon", strikes: [], index: 0, error: undefined, picked: false } : s;
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
        : { ...s, step: "roll", index: 0, error: undefined, strikes: s.targetIds.map((targetId) => ({ targetId, damage: [], ...(a.forced?.[targetId] && { forced: a.forced[targetId] }) })) };
    case "SET_MODE":
      return s.step === "roll" && s.strikes[s.index]?.forced ? s : { ...s, mode: a.mode };
    case "TOGGLE_OBSTACLE":
      return { ...s, obstacle: !s.obstacle };
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

      if (s.step === "roll") return s.index > 0 ? { ...s, index: s.index - 1 } : { ...s, step: "target", picked: false };

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

export function forcedModeOf(p: Pick<PredictedAttack, "mode" | "forced" | "reasons">): ForcedMode | undefined {
  if (!p.forced) return undefined;

  const { advantage, disadvantage } = p.reasons;

  if (p.mode === "advantage") return { mode: p.mode, reason: `Перевага: ${advantage.join(", ")}` };

  if (p.mode === "disadvantage") return { mode: p.mode, reason: `Недолік: ${disadvantage.join(", ")}` };

  return { mode: "normal", reason: `Перевага (${advantage.join(", ")}) і недолік (${disadvantage.join(", ")}) скасовуються` };
}

export function strikeMode(s: Pick<AttackFlowState, "mode">, strike: Strike | undefined): AttackMode {
  return strike?.forced?.mode ?? s.mode;
}

export function effectiveD20(strike: Strike, mode: AttackMode): number {
  const d = strike.d20 ?? 0;

  if (strike.second === undefined || mode === "normal") return d;

  return mode === "advantage" ? Math.max(d, strike.second) : Math.min(d, strike.second);
}

export function attackPayload(s: AttackFlowState, attackerId: string): AttackData & { endTurn: boolean } {
  const manual = s.mode !== "normal" && s.strikes.some((st) => !st.forced);

  const base = { attackerId, attackId: s.attackId, ...(s.obstacle && { obstacle: true }), ...(manual && { rollMode: s.mode }), endTurn: false };

  if (s.strikes.length === 1) {
    const [st] = s.strikes;

    const mode = strikeMode(s, st);

    return {
      ...base,
      targetIds: [st.targetId],
      attackRoll: st.d20,
      ...(st.second !== undefined && mode === "advantage" && { advantageRoll: st.second }),
      ...(st.second !== undefined && mode === "disadvantage" && { disadvantageRoll: st.second }),
      damageRolls: isHit(st) ? st.damage : [],
    } as AttackData & { endTurn: boolean };
  }

  const hits = s.strikes.filter(isHit);

  // промахи теж ідуть на сервер з кидками: їх видно в журналі й спрацьовують реакції цілей
  return {
    ...base,
    targetIds: s.strikes.map((st) => st.targetId),
    attackRolls: s.strikes.map((st) => st.d20 ?? 0),
    ...(s.strikes.some((st) => st.second !== undefined) && { secondRolls: s.strikes.map((st) => st.second ?? null) }),
    damageRolls: hits.flatMap((st) => st.damage),
  } as AttackData & { endTurn: boolean };
}
