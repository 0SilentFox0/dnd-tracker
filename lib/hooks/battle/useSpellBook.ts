"use client";

import { useMemo, useReducer, useState } from "react";

import { useBattleRules } from "./useBattleRules";
import { useBattleScene } from "./useBattleScene";
import { useBattleSpellLibrary } from "./useBattleSpellLibrary";
import { useIngredientPlan } from "./useIngredientPlan";
import { useSpellBookTargets } from "./useSpellBookTargets";
import { useSpellCastSubmit } from "./useSpellCastSubmit";

import { joinLines, textRef } from "@/lib/i18n/text-ref";
import { useText } from "@/lib/i18n/use-text";
import { reactionBlocker } from "@/lib/utils/battle/actions/reaction";
import {
  buildSpellPick,
  casterUsesUniversalSlot,
  castPreviewOf,
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
import type { SystemSlot } from "@/lib/utils/rules/systems/slot";
import { groupSpellsByLevel, levelsWithSpells } from "@/lib/utils/spells/group-by-level";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";
import type { LogLine } from "@/types/text";

export { useBonusSpells, useReactionSpells, useSpellBookPrefetch } from "./useBattleSpellLibrary";

export type { BookSpell };

export function useSpellBook(
  caster: BattleParticipant | null,
  options: { reactionsOnly?: boolean; allSpells?: boolean; onDone?: () => void; legendary?: { abilityKey: string; spellId: string } } = {},
) {
  const scene = useBattleScene();

  const { magic } = useBattleRules();

  const text = useText();

  const [finishLong, setFinishLong] = useState(false);

  const [flow, dispatch] = useReducer(spellFlow, initialSpellFlow);


  const isOpen = flow.step !== "closed" && !!caster;

  const free = !!options.allSpells;

  const special = options.legendary;

  const costFree = free || !!special;

  const bypassCost = costFree || magic;

  const spells = useBattleSpellLibrary(caster, { isOpen, free, specialSpellId: special?.spellId, reactionsOnly: options.reactionsOnly });

  const byLevel = useMemo(() => groupSpellsByLevel(spells), [spells]);

  const levels = useMemo(() => levelsWithSpells(byLevel), [byLevel]);

  if (flow.step === "book" && !flow.levelPinned && levels.length > 0 && !levels.includes(flow.level)) {
    dispatch({ type: "SPELLS_LOADED", levels });
  }

  const selected = useMemo(() => spells.find((s) => s.id === flow.pick?.spellId) ?? null, [spells, flow.pick?.spellId]);

  const order = scene.battle.initiativeOrder;

  const map = scene.battle.map ?? null;

  const build = (s: BookSpell, opts: { castLevel?: number; test?: boolean } = {}) => buildSpellPick(order, caster, s, map, { castLevel: opts.castLevel, castTest: magic && !costFree && opts.test !== false });

  if (flow.step === "book" && special && spells[0]) {
    dispatch({ type: "PICK", pick: build(spells[0], { castLevel: caster?.spellcasting.grants?.find((g) => g.spellId === special.spellId)?.castLevel }) });
  }

  const { targets, onMap, inRange, filteredOut, hover, aimPreviewAt, mapTargeting, chain, state } = useSpellBookTargets(caster, flow, dispatch);

  const saveTargets = spellSaveTargets(targets, state, scene.viewer);

  const universalSlot = casterUsesUniversalSlot(caster);

  const wideningOf = (s: BookSpell) => spellWidening(order, caster, s, onMap);

  const { grantsOf, grantOf, canSlot, slotChoices, selectedGrant, sourceOptions, castLevelOptions, formulaOf } = spellSourceModel(caster, flow, selected, bypassCost);

  const ingredients = useIngredientPlan(caster, selected, costFree || !!selectedGrant || !!selected?.grantKey, state.useIngredient ?? false);

  useSpellCastSubmit({ caster, selected, flow: { state, dispatch }, cast: { free, legendaryKey: special?.abilityKey, finishLong }, onDone: options.onDone });

  const labelOf = (s: BookSpell) => (s.grantKey ? inlineGrantLabel(caster, inlineGrantOf(caster, s)) : grantLabelOf(caster, s.id));

  const firstUsable = (who: BattleParticipant) => slotLevels(who).find((l) => l.current > 0)?.level ?? 0;

  const castPreview = magic && caster && selected && state.pick?.castTest ? castPreviewOf(caster, scene.battle.rules, selected.casting?.magic?.kind) : null;

  const view = {
    cast: castPreview && { ...castPreview, cn: selected?.casting?.magic?.cn ?? 0 },
    caster,
    spells,
    byLevel,
    selected,
    targets,
    saveTargets,
    hover,
    aimPreviewAt,
    mapTargeting,
    chain,
    inRange,
    filteredOut,
    formulaOf: (s: BookSpell) => text(formulaOf(s)),
    wideningOf,
    definitionOf: spellDefinition,
    slots: caster ? slotLevels(caster) : [],
    universalSlot,
    free,
    timing: selected?.casting,
    ingredients,
    pendingCast: caster?.battleData.pendingCast,
    canFastForward: scene.viewer.isDM,
    grantLabel: labelOf,
    sourceOptions,
    sourceValue: flow.grantKey ? `grant:${flow.grantKey}` : flow.slotKey ? `slot:${flow.slotKey}` : "",
    castLevelOptions,
    castLevelValue: flow.castLevel ?? selectedGrant?.castLevel,
    magic,
    slotLeft: (level: number) => spellSlotsLeft(caster, level, bypassCost || spells.some((s) => s.level === level && !!grantOf(s))),
    slotCostLabel: (s: BookSpell) => {
      const parts = [special ? textRef("battleWizards.flow.cost.special") : undefined, labelOf(s)].filter((p): p is LogLine => p !== undefined && p !== "");

      return parts.length > 0 ? joinLines(parts, " · ") : spellSlotCostLabel(s, { free, universal: universalSlot, chosen: slotChoices.find((o) => o.key === state.slotKey)?.label });
    },
    slot: { options: slotChoices, value: state.slotKey },
    noSlot: (s: BookSpell) => !canSlot(s) && spellBlockedBySlots(caster, s.level, bypassCost),
    attackTargets: state.pick?.needsAttackRolls ? targets.filter((t) => state.targetIds.includes(t.basicInfo.id)) : [],
    costUsed: (s: BookSpell) => costBlocked({
      caster,
      spell: s,
      definitionCost: spellDefinition(s).cost,
      grants: s.grantKey ? [inlineGrantOf(caster, s)].filter((g) => !!g) : grantsOf(s),
      grant: s.grantKey ? inlineGrantOf(caster, s) : grantOf(s),
      slotKey: state.slotKey,
      free,
      bypassCost,
      special: !!special,
      isDM: scene.viewer.isDM,
      isMyTurn: order[scene.battle.currentTurnIndex]?.basicInfo.id === caster?.basicInfo.id, reactionBlocked: !!caster && !!reactionBlocker(caster),
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

      dispatch({
        type: "PICK",
        pick: build(s, { castLevel: grant?.castLevel ?? first?.castLevel, test: !grant }),
        ...(first && { slotKey: first.key }),
        ...(grant?.key && { grantKey: grant.key }),
        ...(grant?.upcast && grant.castLevel !== undefined && { castLevel: grant.castLevel }),
      });
    },
    setSlot: (key: string) => {
      const option = selected && slotChoices.find((o) => o.key === key);

      if (selected && option) dispatch({ type: "SET_SLOT", slotKey: key, pick: build(selected, { castLevel: option.castLevel }) });
    },
    setSource: (value: string) => {
      if (!selected) return;

      if (value.startsWith("slot:")) return actions.setSlot(value.slice("slot:".length));

      const grant = grantsOf(selected).find((g) => g.key === value.slice("grant:".length));

      if (grant?.key) {
        dispatch({
          type: "SET_GRANT",
          grantKey: grant.key,
          pick: build(selected, { castLevel: grant.castLevel, test: false }),
          ...(grant.upcast && grant.castLevel !== undefined && { castLevel: grant.castLevel }),
        });
      }
    },
    setCastLevel: (castLevel: number) => {
      if (selected && selectedGrant) dispatch({ type: "SET_CAST_LEVEL", castLevel, pick: build(selected, { castLevel, test: false }) });
    },
    setOption: (index: number) => dispatch({ type: "SET_OPTION", index }),
    setInputCount: (count: number) => dispatch({ type: "SET_INPUT", count }),
    setAttack: (id: string, v: number | undefined) => dispatch({ type: "SET_ATTACK", id, value: v }),
    prepareCast: async (cancel = false) => {
      if (!caster || !selected) return;

      try {
        await scene.actions.castSpell.mutateAsync({
          ...spellPayload(state),
          spellId: cancel ? (caster.battleData.pendingCast?.spellId ?? selected.id) : selected.id,
          targetIds: [],
          diceRolls: [],
          ...(cancel && { cancelCasting: true }),
        });
        dispatch({ type: "CLOSE" });
        options.onDone?.();
      } catch (e) { dispatch({ type: "FAIL", error: e instanceof Error ? e.message : textRef("battleWizards.spell.continueFailed") }); }
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
    setCastRoll: (roll?: number, second?: number) => dispatch({ type: "SET_CAST_ROLL", roll, second }),
    setUseIngredient: (value: boolean) => dispatch({ type: "SET_CAST_INGREDIENT", value }),
    setCastSystem: (value: SystemSlot | null) => dispatch({ type: "SET_CAST_SYSTEM", value }),
    toSummary: () => dispatch({ type: "TO_SUMMARY" }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };

  return { state, view, actions };
}
