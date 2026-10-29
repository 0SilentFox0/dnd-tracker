"use client";

import { useMemo, useReducer, useState } from "react";

import { useBattleScene } from "./useBattleScene";
import { useBattleSpellLibrary } from "./useBattleSpellLibrary";
import { useSpellBookTargets } from "./useSpellBookTargets";
import { useSpellCastSubmit } from "./useSpellCastSubmit";

import { reactionBlocker } from "@/lib/utils/battle/actions/reaction";
import {
  buildSpellPick,
  casterUsesUniversalSlot,
  costBlocked,
  defaultGrant,
  grantLabel as grantLabelOf,
  initialSpellFlow,
  inlineGrantLabel,
  inlineGrantOf,
  slotOptions,
  spellBlockedBySlots,
  spellDefinition,
  spellFlow,
  spellPayload,
  spellSaveTargets,
  spellSlotCostLabel,
  spellSlotsLeft,
  spellSourceModel,
  spellWidening,
} from "@/lib/utils/battle/flows";
import { slotLevels } from "@/lib/utils/battle/view";
import { cryptoRandom, rollDie } from "@/lib/utils/common/dice";
import { groupSpellsByLevel, levelsWithSpells } from "@/lib/utils/spells/group-by-level";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export { useBonusSpells, useReactionSpells, useSpellBookPrefetch } from "./useBattleSpellLibrary";

export type { BookSpell };

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

  const { targets, onMap, inRange, filteredOut, hover, aimPreviewAt, mapTargeting, chain, state } = useSpellBookTargets(caster, flow, dispatch);

  const saveTargets = spellSaveTargets(targets, state, scene.viewer);

  const universalSlot = casterUsesUniversalSlot(caster);

  const wideningOf = (s: BookSpell) => spellWidening(order, caster, s, onMap);

  const { grantsOf, grantOf, canSlot, slotChoices, selectedGrant, sourceOptions, castLevelOptions, formulaOf } = spellSourceModel(caster, flow, selected, bypassCost);

  useSpellCastSubmit({ caster, selected, flow: { state, dispatch }, cast: { free, legendaryKey: special?.abilityKey, finishLong }, onDone: options.onDone });

  const labelOf = (s: BookSpell) => (s.grantKey ? inlineGrantLabel(caster, inlineGrantOf(caster, s)) : grantLabelOf(caster, s.id));

  const firstUsable = (who: BattleParticipant) => slotLevels(who).find((l) => l.current > 0)?.level ?? 0;

  const view = {
    spells, byLevel, selected, targets, saveTargets, hover, aimPreviewAt, mapTargeting, chain, inRange, filteredOut, formulaOf, wideningOf, definitionOf: spellDefinition, slots: caster ? slotLevels(caster) : [],
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
