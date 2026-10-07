import type { SpellCastData } from "@/types/api";

export type SpellTargetMode = "none" | "single" | "multi" | "all";

export interface SpellPick {
  spellId: string;
  level: number;
  targetMode: SpellTargetMode;
  maxTargets?: number;
  needsHit: boolean;
  needsSaves: boolean;
  diceSlots: number[];
}

export interface SpellFlowState {
  step: "closed" | "book" | "spell" | "targets" | "rolls" | "summary" | "submitting" | "result";
  casterId?: string;
  level: number;
  pick?: SpellPick;
  targetIds: string[];
  hitRoll?: number;
  saves: Record<string, number>;
  damage: (number | undefined)[];
  error?: string;
}

export type SpellFlowAction =
  | { type: "OPEN"; casterId: string; level: number }
  | { type: "SET_LEVEL"; level: number }
  | { type: "PICK"; pick: SpellPick }
  | { type: "TO_TARGETS" }
  | { type: "TOGGLE_TARGET"; id: string; expanded?: string[] }
  | { type: "CONFIRM_TARGETS" }
  | { type: "SET_HIT"; value: number }
  | { type: "SET_SAVE"; id: string; value: number }
  | { type: "SET_DAMAGE"; index: number; value: number }
  | { type: "TO_SUMMARY" }
  | { type: "BACK" }
  | { type: "SUBMIT" }
  | { type: "SUCCESS" }
  | { type: "FAIL"; error: string }
  | { type: "CLOSE" };

export const initialSpellFlow: SpellFlowState = { step: "closed", level: 0, targetIds: [], saves: {}, damage: [] };

const needsRolls = (p: SpellPick) => p.needsHit || p.needsSaves || p.diceSlots.length > 0;

export function rollsComplete(s: SpellFlowState): boolean {
  if (!s.pick) return false;

  if (s.pick.needsHit && !(s.hitRoll && s.hitRoll >= 1 && s.hitRoll <= 20)) return false;

  return s.pick.diceSlots.every((_, i) => typeof s.damage[i] === "number");
}

const afterTargets = (s: SpellFlowState): SpellFlowState =>
  s.pick && needsRolls(s.pick) ? { ...s, step: "rolls" } : { ...s, step: "summary" };

export function spellFlow(s: SpellFlowState, a: SpellFlowAction): SpellFlowState {
  switch (a.type) {
    case "OPEN":
      return { ...initialSpellFlow, step: "book", casterId: a.casterId, level: a.level };
    case "SET_LEVEL":
      return { ...initialSpellFlow, step: "book", casterId: s.casterId, level: a.level };
    case "PICK":
      return { ...s, step: "spell", pick: a.pick, targetIds: [], saves: {}, hitRoll: undefined, damage: a.pick.diceSlots.map(() => undefined), error: undefined };
    case "TO_TARGETS":
      if (!s.pick) return s;

      return s.pick.targetMode === "none" ? afterTargets(s) : { ...s, step: "targets" };
    case "TOGGLE_TARGET": {
      if (s.pick?.targetMode === "single") return { ...s, targetIds: [a.id], saves: {} };

      if (s.pick?.targetMode === "all") return { ...s, targetIds: a.expanded ?? [a.id], saves: {} };

      if (s.targetIds.includes(a.id)) {
        const { [a.id]: _gone, ...saves } = s.saves;

        return { ...s, targetIds: s.targetIds.filter((id) => id !== a.id), saves };
      }

      if (s.pick?.maxTargets !== undefined && s.targetIds.length >= s.pick.maxTargets) return s;

      return { ...s, targetIds: [...s.targetIds, a.id] };
    }
    case "CONFIRM_TARGETS":
      return s.targetIds.length === 0 ? s : afterTargets(s);
    case "SET_HIT":
      return { ...s, hitRoll: a.value };
    case "SET_SAVE":
      return { ...s, saves: { ...s.saves, [a.id]: a.value } };
    case "SET_DAMAGE":
      return { ...s, damage: s.damage.map((v, i) => (i === a.index ? a.value : v)) };
    case "TO_SUMMARY":
      return rollsComplete(s) ? { ...s, step: "summary", error: undefined } : s;
    case "BACK": {
      const order: SpellFlowState["step"][] = ["book", "spell", "targets", "rolls", "summary"];

      let i = order.indexOf(s.step) - 1;

      if (order[i] === "rolls" && s.pick && !needsRolls(s.pick)) i -= 1;

      if (order[i] === "targets" && s.pick?.targetMode === "none") i -= 1;

      return i >= 0 ? { ...s, step: order[i], error: undefined } : s;
    }
    case "SUBMIT":
      return s.step === "summary" ? { ...s, step: "submitting", error: undefined } : s;
    case "SUCCESS":
      return { ...s, step: "result" };
    case "FAIL":
      return { ...s, step: "summary", error: a.error };
    case "CLOSE":
      return initialSpellFlow;
  }
}

export function spellPayload(s: SpellFlowState, casterType: string): SpellCastData {
  const saves = Object.entries(s.saves).map(([participantId, roll]) => ({ participantId, roll }));

  return {
    casterId: s.casterId as string,
    casterType,
    spellId: s.pick?.spellId as string,
    targetIds: s.pick?.targetMode === "none" ? [] : s.targetIds,
    damageRolls: s.damage.filter((v): v is number => typeof v === "number"),
    ...(saves.length > 0 && { savingThrows: saves }),
    ...(s.pick?.needsHit && s.hitRoll !== undefined && { hitRoll: s.hitRoll }),
  };
}
