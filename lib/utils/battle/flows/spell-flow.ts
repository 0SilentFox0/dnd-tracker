import type { SpellFlowAction, SpellFlowState, SpellPick } from "./spell-flow-types";

import type { SpellCastData } from "@/types/api";

export * from "./spell-costs";
export * from "./spell-flow-types";
export * from "./spell-pick";

export const initialSpellFlow: SpellFlowState = { step: "closed", level: 0, targetIds: [], saves: {}, attacks: {}, damage: [] };

const selfCentered = (p: SpellPick | undefined) => p?.template?.shape === "emanation";

const needsRolls = (p: SpellPick) => p.needsSaves || !!p.needsAttackRolls || p.diceSlots.length > 0;

export const optionMissing = (s: SpellFlowState): boolean => !!s.pick?.options && s.optionIndex === undefined;

export function rollsComplete(s: SpellFlowState): boolean {
  if (!s.pick) return false;

  return s.pick.diceSlots.every((_, i) => typeof s.damage[i] === "number");
}

const afterTargets = (s: SpellFlowState): SpellFlowState =>
  s.pick && needsRolls(s.pick) ? { ...s, step: "rolls" } : { ...s, step: "summary" };

const BACK_ORDER: SpellFlowState["step"][] = ["book", "spell", "targets", "rolls", "summary"];

function previousStep(s: SpellFlowState): SpellFlowState["step"] | null {
  let i = BACK_ORDER.indexOf(s.step) - 1;

  if (BACK_ORDER[i] === "rolls" && s.pick && !needsRolls(s.pick)) i -= 1;

  if (BACK_ORDER[i] === "targets" && (s.pick?.targetMode === "none" || s.pick?.targetMode === "all" || selfCentered(s.pick))) i -= 1;

  return i >= 0 ? BACK_ORDER[i] : null;
}

export const canGoBack = (s: SpellFlowState): boolean => previousStep(s) !== null;

const firstLevelWithSpells = (current: number, levels: number[]): number =>
  levels.length === 0 || levels.includes(current) ? current : Math.min(...levels);

function reconcileSpellPick(s: SpellFlowState, pick: SpellPick, patch: Partial<SpellFlowState>): SpellFlowState {
  const sameDice = s.pick?.diceSlots.length === pick.diceSlots.length && s.pick.diceSlots.every((d, i) => d === pick.diceSlots[i]);

  const targetIds = pick.maxTargets === undefined ? s.targetIds : s.targetIds.slice(0, pick.maxTargets);

  const kept = <T,>(rolls: Record<string, T>) => Object.fromEntries(Object.entries(rolls).filter(([id]) => targetIds.includes(id)));

  const next: SpellFlowState = { ...s, ...patch, pick, targetIds, saves: kept(s.saves), attacks: kept(s.attacks), damage: sameDice ? s.damage : pick.diceSlots.map(() => undefined), error: undefined };

  return next.step === "summary" && !rollsComplete(next) ? { ...next, step: "rolls" } : next;
}

export function spellFlow(s: SpellFlowState, a: SpellFlowAction): SpellFlowState {
  switch (a.type) {
    case "OPEN":

      return { ...initialSpellFlow, step: "book", casterId: a.casterId, level: firstLevelWithSpells(a.level, a.levels ?? []) };
    case "SPELLS_LOADED":

      return s.step !== "book" || s.levelPinned ? s : { ...s, level: firstLevelWithSpells(s.level, a.levels) };
    case "SET_LEVEL":

      return { ...initialSpellFlow, step: "book", casterId: s.casterId, level: a.level, levelPinned: true };
    case "PICK":

      return { ...s, step: "spell", pick: a.pick, slotKey: a.slotKey, grantKey: a.grantKey, castLevel: a.castLevel, optionIndex: undefined, targetIds: [], aim: undefined, saves: {}, attacks: {}, damage: a.pick.diceSlots.map(() => undefined), error: undefined };
    case "SET_SLOT":
      return reconcileSpellPick(s, a.pick, { slotKey: a.slotKey, grantKey: undefined, castLevel: undefined });
    case "SET_GRANT":
      return reconcileSpellPick(s, a.pick, { grantKey: a.grantKey, castLevel: a.castLevel, slotKey: undefined });
    case "SET_CAST_LEVEL":
      return reconcileSpellPick(s, a.pick, { castLevel: a.castLevel });
    case "SET_OPTION":
      return s.pick?.options && a.index >= 0 && a.index < s.pick.options.length ? { ...s, optionIndex: a.index } : s;
    case "SET_ATTACK": {
      const { [a.id]: _cleared, ...rest } = s.attacks;

      return { ...s, attacks: a.value === undefined ? rest : { ...rest, [a.id]: a.value } };
    }
    case "TO_TARGETS":

      if (!s.pick) return s;

      return s.pick.targetMode === "none" || s.pick.targetMode === "all" || selfCentered(s.pick) ? afterTargets(s) : { ...s, step: "targets" };
    case "TOGGLE_TARGET": {
      if (s.pick?.targetMode === "single") return { ...s, targetIds: [a.id], saves: {} };

      if (s.targetIds.includes(a.id)) {
        const { [a.id]: _gone, ...saves } = s.saves;

        return { ...s, targetIds: s.targetIds.filter((id) => id !== a.id), saves };
      }

      if (s.pick?.maxTargets !== undefined && s.targetIds.length >= s.pick.maxTargets) return s;

      return { ...s, targetIds: [...s.targetIds, a.id] };
    }
    case "PICK_TARGET": {
      if (s.step !== "targets") return s;

      const next = spellFlow(s, { type: "TOGGLE_TARGET", id: a.id });

      return next.pick?.targetMode === "single" && !next.pick.chain ? spellFlow(next, { type: "CONFIRM_TARGETS" }) : next;
    }
    case "SET_AIM": {
      if (s.step !== "targets" || s.pick?.targetMode !== "template") return s;

      const saves = Object.fromEntries(Object.entries(s.saves).filter(([id]) => a.targetIds.includes(id)));

      return { ...s, aim: a.aim, targetIds: a.targetIds, saves };
    }
    case "CONFIRM_TARGETS":

      if (s.step !== "targets") return s;

      if (s.pick?.targetMode === "template") return s.aim ? afterTargets(s) : s;

      return s.targetIds.length === 0 ? s : afterTargets(s);
    case "SET_SAVE": {
      const { [a.id]: _cleared, ...rest } = s.saves;

      return { ...s, saves: a.value === undefined ? rest : { ...rest, [a.id]: a.value } };
    }
    case "SET_DAMAGE":

      return { ...s, damage: s.damage.map((v, i) => (i === a.index ? a.value : v)) };
    case "TO_SUMMARY":

      return rollsComplete(s) ? { ...s, step: "summary", error: undefined } : s;
    case "BACK": {
      const prev = previousStep(s);

      return prev ? { ...s, step: prev, error: undefined } : s;
    }
    case "SUBMIT":

      return s.step === "summary" ? { ...s, step: "submitting", error: undefined } : s;
    case "WAIT_CRIT":
      return s.step === "submitting" ? { ...s, waitingCrit: true } : s;
    case "SUCCESS":

      return { ...s, step: "result", waitingCrit: false };
    case "FAIL":

      return { ...s, step: "summary", error: a.error, waitingCrit: false };
    case "CLOSE":

      return initialSpellFlow;
  }
}

function withTargets(s: SpellFlowState, ids: string[]): SpellFlowState {
  if (ids.length === s.targetIds.length && ids.every((id, i) => id === s.targetIds[i])) return s;

  return { ...s, targetIds: ids, saves: Object.fromEntries(Object.entries(s.saves).filter(([id]) => ids.includes(id))) };
}

/** Шаблон: цілі — ті, кого точка зачіпає зараз; рух після наведення змінює список, тож підказки й каст беруть живий. */
export function withLiveAimTargets(s: SpellFlowState, liveIds: string[]): SpellFlowState {
  return s.pick?.targetMode === "template" && (s.aim || selfCentered(s.pick)) ? withTargets(s, liveIds) : s;
}

/** «all»: цілі не обирають — уся сторона заклинання зараз, тож рятунки й підсумок бачать живий список. */
export function withAllTargets(s: SpellFlowState, sideIds: string[]): SpellFlowState {
  return s.pick?.targetMode === "all" ? withTargets(s, sideIds) : s;
}

/** Ланцюг: обрана лише перша ціль, а рятунки й підсумок бачать увесь ланцюг від неї. */
export function withChainTargets(s: SpellFlowState, chainIds: string[]): SpellFlowState {
  return s.pick?.chain && s.targetIds.length > 0 ? withTargets(s, chainIds) : s;
}

export function spellPayload(s: SpellFlowState): SpellCastData {
  const saves = Object.entries(s.saves).map(([participantId, roll]) => ({ participantId, roll }));

  const attacks = s.pick?.needsAttackRolls ? Object.entries(s.attacks).filter(([id]) => s.targetIds.includes(id)).map(([participantId, roll]) => ({ participantId, roll })) : [];

  return {
    casterId: s.casterId as string,
    spellId: s.pick?.spellId as string,
    targetIds: s.pick?.targetMode === "none" ? [] : s.pick?.chain ? s.targetIds.slice(0, 1) : s.targetIds,
    ...(s.pick?.targetMode === "template" && !selfCentered(s.pick) && s.aim && { targetCell: s.aim }),
    diceRolls: s.damage.filter((v): v is number => typeof v === "number"),
    ...(saves.length > 0 && { saveRolls: saves }),
    ...(attacks.length > 0 && { attackRolls: attacks }),
    ...(s.slotKey && { slotKey: s.slotKey }),
    ...(s.grantKey && { grantKey: s.grantKey }),
    ...(s.castLevel !== undefined && { castLevel: s.castLevel }),
    ...(s.pick?.options && s.optionIndex !== undefined && { optionIndex: s.optionIndex }),
  };
}
