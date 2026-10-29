"use client";

import { useEffect, useEffectEvent, useMemo, useReducer, useState } from "react";

import { useModeView } from "./modes/useModeView";
import { useBattleScene } from "./useBattleScene";
import { useBattleSpellLibrary } from "./useBattleSpellLibrary";
import { CRIT_CANCELLED, useCritPause } from "./useCritPause";
import { useSpellMapTargeting } from "./useSpellMapTargeting";

export { useBonusSpells, useReactionSpells,useSpellBookPrefetch } from "./useBattleSpellLibrary";
import { reactionBlocker } from "@/lib/utils/battle/actions/reaction";
import {
  buildSpellPick,
  canCastFromSlot,
  casterUsesUniversalSlot,
  castLevelOptions as castLevelOptionsOf,
  costBlocked,
  defaultGrant,
  grantLabel as grantLabelOf,
  grantsFor,
  initialSpellFlow,
  inlineGrantLabel,
  inlineGrantOf,
  selectedGrantOf,
  slotOptions,
  sourceOptions as sourceOptionsOf,
  spellAimTargets,
  spellBlockedBySlots,
  spellDefinition,
  spellFlow,
  spellPayload,
  spellSaveTargets,
  spellSlotCostLabel,
  spellSlotsLeft,
  spellTargetCandidates,
  spellTargetInRange,
  spellWidening,
  withAllTargets,
  withChainTargets,
  withLiveAimTargets,
} from "@/lib/utils/battle/flows";
import { isOnMap } from "@/lib/utils/battle/grid";
import { modeSightedTargets } from "@/lib/utils/battle/modes/engine";
import { spellEffectsFormula, spellFormulaLabel } from "@/lib/utils/battle/spell/caster-dice";
import { skillAllTargets, spellChain } from "@/lib/utils/battle/spell/spell-targeting";
import { matchesTargetFilter } from "@/lib/utils/battle/spell/target-filter";
import { slotLevels } from "@/lib/utils/battle/view";
import { cryptoRandom, rollDie } from "@/lib/utils/common/dice";
import { groupSpellsByLevel } from "@/lib/utils/spells/group-by-level";
import type { BattleParticipant, GridPoint } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export type { BookSpell };

/** Сумарна зміна HP на учасника: шкода > 0, лікування < 0. */
function hpTotals(changes: { participantId: string; participantName: string; change: number }[]): { name: string; change: number }[] {
  const byId = new Map<string, { name: string; change: number }>();

  for (const c of changes) {
    const kept = byId.get(c.participantId);

    byId.set(c.participantId, { name: c.participantName, change: (kept?.change ?? 0) + c.change });
  }

  return [...byId.values()].filter((c) => c.change !== 0);
}

const levelsWithSpells = (byLevel: Record<number, BookSpell[]>) =>
  Object.keys(byLevel).map(Number).filter((l) => byLevel[l].length > 0);

export function useSpellBook(caster: BattleParticipant | null, options: { reactionsOnly?: boolean; allSpells?: boolean; onDone?: () => void; legendary?: { abilityKey: string; spellId: string } } = {}) {
  const scene = useBattleScene();

  const [finishLong, setFinishLong] = useState(false);

  const [flow, dispatch] = useReducer(spellFlow, initialSpellFlow);


  const isOpen = flow.step !== "closed" && !!caster;

  const free = !!options.allSpells;

  const special = options.legendary;

  const bypassCost = free || !!special;

  const spells = useBattleSpellLibrary(caster, { isOpen, free, specialSpellId: special?.spellId, reactionsOnly: options.reactionsOnly });

  const byLevel = useMemo(() => groupSpellsByLevel(spells), [spells]);

  const levels = useMemo(() => levelsWithSpells(byLevel), [byLevel]);

  if (flow.step === "book" && !flow.levelPinned && levels.length > 0 && !levels.includes(flow.level)) {
    dispatch({ type: "SPELLS_LOADED", levels });
  }

  const selected = useMemo(() => spells.find((s) => s.id === flow.pick?.spellId) ?? null, [spells, flow.pick?.spellId]);

  const order = scene.battle.initiativeOrder;

  if (flow.step === "book" && special && spells[0]) {
    dispatch({ type: "PICK", pick: buildSpellPick(order, caster, spells[0], scene.battle.map ?? null, { castLevel: caster?.spellcasting.grants?.find((g) => g.spellId === special.spellId)?.castLevel }) });
  }

  const map = scene.battle.map ?? null;

  const { visible } = useModeView();

  const pickSide = flow.pick?.targetMode === "template" ? undefined : flow.pick?.targetSide;

  const targets = useMemo(() => spellTargetCandidates(order, caster, pickSide).filter(visible), [order, caster, pickSide, visible]);

  const filteredOut = (t: BattleParticipant) => !matchesTargetFilter(t, flow.pick?.filter, { spellLevel: flow.pick?.level ?? 0, castLevel: flow.pick?.castLevel });

  const inRange = (t: BattleParticipant) => spellTargetInRange(map, caster, t, flow.pick?.range) && !filteredOut(t);

  const aimPick = flow.pick?.targetMode === "template" ? flow.pick : undefined;

  const touchedAt = (cell: GridPoint | null | undefined) => {
    const aim = aimPick?.template?.shape === "emanation" ? caster?.battleData.position : cell;

    return map && caster && aimPick && aim ? spellAimTargets({ map, participants: order, caster }, aimPick, aim) : [];
  };

  const onMap = !!map && !!caster && isOnMap(caster);

  // полеглі зникають з карти — воскресіння обирає ціль зі списку у вікні

  const mapTargeting = flow.step === "targets" && onMap && flow.pick?.targetSide !== "dead";

  const mapCandidates = useMemo(() => targets.filter(isOnMap), [targets]);

  const hover = useSpellMapTargeting(flow, dispatch, {
    caster, order, map, active: mapTargeting, candidates: mapCandidates, inRange, filteredOut, setMapAim: scene.intents.setMapAim, setMapPick: scene.intents.setMapPick,
  });

  const aimPreviewAt = (cell: GridPoint) => ({ targets: touchedAt(cell).filter(visible).map((p) => ({ participant: p, ally: p.basicInfo.side === caster?.basicInfo.side })) });

  const chainFirst = flow.pick?.chain ? order.find((p) => p.basicInfo.id === flow.targetIds[0]) : undefined;

  const chain = caster && chainFirst && flow.pick?.chain ? spellChain({ participants: order, caster }, flow.pick.chain, chainFirst) : [];

  const allSide = flow.pick?.targetMode === "all" && caster && (flow.pick.targetSide === "ally" || flow.pick.targetSide === "enemy") ? modeSightedTargets(map, order, caster, skillAllTargets(order, caster, flow.pick.targetSide)) : [];

  // від точки, а не від id на момент кліку: рух до касту змінює, кого зачепить

  const state = withAllTargets(withChainTargets(withLiveAimTargets(flow, touchedAt(flow.aim).map((p) => p.basicInfo.id)), chain.map((p) => p.basicInfo.id)), allSide);

  const saveTargets = spellSaveTargets(targets, state, scene.viewer);

  const universalSlot = casterUsesUniversalSlot(caster);

  const wideningOf = (s: BookSpell) => spellWidening(order, caster, s, onMap);

  const castLevelOf = (s: BookSpell): number | undefined => {
    if (flow.castLevel !== undefined) return flow.castLevel;

    const grantLevel = grantOf(s)?.castLevel;

    if (grantLevel !== undefined) return grantLevel;

    if (!caster || !flow.slotKey || flow.pick?.spellId !== s.id) return undefined;

    return slotOptions(caster, s.level).find((o) => o.key === flow.slotKey)?.castLevel;
  };

  const formulaOf = (s: BookSpell): string => {
    if (!caster) return "";

    const def = spellDefinition(s);

    if (flow.pick?.spellId === s.id && flow.pick.inputDice) return `${flow.pick.diceSlots.length}к${flow.pick.inputDice.sides}`;

    if (def.dice === 0) return spellEffectsFormula(s.spellEffects ?? []);

    return spellFormulaLabel(caster, { dice: def.dice, groupId: s.spellGroup?.id ?? null, level: s.level, dieSides: s.dieSides, upcastDice: s.upcastDice, fixedDice: s.fixedDice }, castLevelOf(s));
  };

  const grantsOf = (s: BookSpell) => grantsFor(caster, s.id);

  const labelOf = (s: BookSpell) => (s.grantKey ? inlineGrantLabel(caster, inlineGrantOf(caster, s)) : grantLabelOf(caster, s.id));

  const grantOf = (s: BookSpell) => selectedGrantOf(grantsOf(s), flow);

  const canSlot = (s: BookSpell) => canCastFromSlot(caster, s.id);

  const slotChoices = selected && !bypassCost && canSlot(selected) ? slotOptions(caster, selected.level) : [];

  const sourceOptions = selected ? sourceOptionsOf(caster, grantsOf(selected), slotChoices) : [];

  const selectedGrant = selected ? grantOf(selected) : undefined;

  const castLevelOptions = castLevelOptionsOf(caster, selectedGrant);

  const finish = (changes: { participantId: string; participantName: string; change: number }[]) => {
    dispatch({ type: "SUCCESS" });
    scene.result.show({ kind: "spell", spellName: selected?.name ?? "Заклинання", changes: hpTotals(changes), targetCount: state.targetIds.length });
    options.onDone?.();
  };

  const pauseCrit = useCritPause({
    waiting: state.waitingCrit,
    actorId: caster?.basicInfo.id,
    onResolved: (seen) => {
      const log = scene.readBattle()?.battleLog ?? [];

      finish(log.filter((e) => !seen.has(e.actionIndex) && e.actorId === caster?.basicInfo.id).flatMap((e) => e.hpChanges ?? []));
    },
    onCancelled: () => dispatch({ type: "FAIL", error: CRIT_CANCELLED }),
  });

  const send = useEffectEvent(async () => {
    if (!caster) return;

    const seen = new Set((scene.battle.battleLog ?? []).map((e) => e.actionIndex));

    try {
      const res = await scene.actions.castSpell.mutateAsync({ ...spellPayload(state), ...(free && { free: true }), ...(special && { legendaryKey: special.abilityKey }), ...(finishLong && caster.battleData.pendingCast && { castingRounds: caster.battleData.pendingCast.remainingRounds }) });

      if (res?.pendingCritChoice) {
        pauseCrit(seen);
        dispatch({ type: "WAIT_CRIT" });

        return;
      }

      finish(res?.hpChanges ?? []);
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : "Не вдалося застосувати заклинання" });
    }
  });

  useEffect(() => {
    if (state.step === "submitting") void send();
  }, [state.step]);

  const firstUsable = (who: BattleParticipant) => slotLevels(who).find((l) => l.current > 0)?.level ?? 0;

  const view = {
    spells, byLevel, selected, targets, saveTargets, hover, aimPreviewAt, mapTargeting, chain: chain.filter(visible), inRange, formulaOf, wideningOf, definitionOf: spellDefinition, slots: caster ? slotLevels(caster) : [],
    universalSlot,
    free,
    timing: selected?.casting,
    pendingCast: caster?.battleData.pendingCast,
    canFastForward: scene.viewer.isDM,
    grantLabel: labelOf,
    sourceOptions,
    sourceValue: flow.grantKey ? `grant:${flow.grantKey}` : flow.slotKey ? `slot:${flow.slotKey}` : "",
    castLevelOptions,
    castLevelValue: flow.castLevel ?? selectedGrant?.castLevel,
    slotLeft: (level: number) => spellSlotsLeft(caster, level, bypassCost || spells.some((s) => s.level === level && !!grantOf(s))),
    slotCostLabel: (s: BookSpell) => [special ? "Легендарна дія / дія лігва" : undefined, labelOf(s)].filter(Boolean).join(" · ") || spellSlotCostLabel(s, { free, universal: universalSlot, chosen: slotChoices.find((o) => o.key === state.slotKey)?.label }),
    slot: { options: slotChoices, value: state.slotKey },
    noSlot: (s: BookSpell) => !canSlot(s) && spellBlockedBySlots(caster, s.level, bypassCost),
    attackTargets: state.pick?.needsAttackRolls ? targets.filter((t) => state.targetIds.includes(t.basicInfo.id)) : [],
    costUsed: (s: BookSpell) => costBlocked({
      caster, spell: s, definitionCost: spellDefinition(s).cost, grants: s.grantKey ? [inlineGrantOf(caster, s)].filter((g) => !!g) : grantsOf(s), grant: s.grantKey ? inlineGrantOf(caster, s) : grantOf(s), slotKey: state.slotKey, free, bypassCost, special: !!special, isDM: scene.viewer.isDM,
      isMyTurn: scene.battle.initiativeOrder[scene.battle.currentTurnIndex]?.basicInfo.id === caster?.basicInfo.id, reactionBlocked: !!caster && !!reactionBlocker(caster),
    }),
  };

  const actions = {
    open: (level?: number, casterOverride?: BattleParticipant) => {
      const who = casterOverride ?? caster;

      if (who) dispatch({ type: "OPEN", casterId: who.basicInfo.id, level: level ?? firstUsable(who), levels });
    },
    setLevel: (level: number) => dispatch({ type: "SET_LEVEL", level }),
    pick: (s: BookSpell) => {
      const grants = grantsOf(s);

      const choices = !bypassCost && canSlot(s) ? slotOptions(caster, s.level) : [];

      const first = grants.length === 0 ? choices[0] : undefined;

      const grant = defaultGrant(grants, { hasSlotChoices: choices.length > 0, spellLevel: s.level });

      dispatch({ type: "PICK", pick: buildSpellPick(order, caster, s, map, { castLevel: grant?.castLevel ?? first?.castLevel }), ...(first && { slotKey: first.key }), ...(grant?.key && { grantKey: grant.key }), ...(grant?.upcast && grant.castLevel !== undefined && { castLevel: grant.castLevel }) });
    },
    setSlot: (key: string) => {
      const option = selected && slotChoices.find((o) => o.key === key);

      if (selected && option) dispatch({ type: "SET_SLOT", slotKey: key, pick: buildSpellPick(order, caster, selected, map, { castLevel: option.castLevel }) });
    },
    setSource: (value: string) => {
      if (!selected) return;

      if (value.startsWith("slot:")) return actions.setSlot(value.slice("slot:".length));

      const grant = grantsOf(selected).find((g) => g.key === value.slice("grant:".length));

      if (grant?.key) dispatch({ type: "SET_GRANT", grantKey: grant.key, pick: buildSpellPick(order, caster, selected, map, { castLevel: grant.castLevel }), ...(grant.upcast && grant.castLevel !== undefined && { castLevel: grant.castLevel }) });
    },
    setCastLevel: (castLevel: number) => {
      if (selected && selectedGrant) dispatch({ type: "SET_CAST_LEVEL", castLevel, pick: buildSpellPick(order, caster, selected, map, { castLevel }) });
    },
    setOption: (index: number) => dispatch({ type: "SET_OPTION", index }),
    setInputCount: (count: number) => dispatch({ type: "SET_INPUT", count }),
    setAttack: (id: string, v: number | undefined) => dispatch({ type: "SET_ATTACK", id, value: v }),
    prepareCast: async (cancel = false) => {
      if (!caster || !selected) return;

      try {
        await scene.actions.castSpell.mutateAsync({ ...spellPayload(state), spellId: cancel ? caster.battleData.pendingCast?.spellId ?? selected.id : selected.id, targetIds: [], diceRolls: [], ...(cancel && { cancelCasting: true }) });
        dispatch({ type: "CLOSE" });
        options.onDone?.();
      } catch (e) { dispatch({ type: "FAIL", error: e instanceof Error ? e.message : "Не вдалося продовжити накладання" }); }
    },
    completeLong: () => { setFinishLong(true); dispatch({ type: "TO_TARGETS" }); },
    toTargets: () => { setFinishLong(false); dispatch({ type: "TO_TARGETS" }); },
    toggleTarget: (id: string) => {
      const target = order.find((p) => p.basicInfo.id === id);

      if (target && !inRange(target)) return;

      dispatch({ type: "TOGGLE_TARGET", id });
    },
    confirmTargets: () => {
      if (state !== flow && state.aim) dispatch({ type: "SET_AIM", aim: state.aim, targetIds: state.targetIds });

      dispatch({ type: "CONFIRM_TARGETS" });
    },
    setSave: (id: string, v: number | undefined) => dispatch({ type: "SET_SAVE", id, value: v }),
    setDamage: (i: number, v: number | undefined) => dispatch({ type: "SET_DAMAGE", index: i, value: v }),
    aiDamage: () => {
      state.pick?.diceSlots.forEach((sides, i) => dispatch({ type: "SET_DAMAGE", index: i, value: rollDie(sides, cryptoRandom) }));

      if (state.pick?.needsAttackRolls) state.targetIds.forEach((id) => state.attacks[id] === undefined && dispatch({ type: "SET_ATTACK", id, value: rollDie(20, cryptoRandom) }));
    },
    toSummary: () => dispatch({ type: "TO_SUMMARY" }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };

  return { state, view, actions };
}
