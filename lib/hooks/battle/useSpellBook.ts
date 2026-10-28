"use client";

import { useEffect, useEffectEvent, useReducer, useState } from "react";

import { useModeView } from "./modes/useModeView";
import { useBattleScene } from "./useBattleScene";
import { useBattleSpellLibrary } from "./useBattleSpellLibrary";
import { useSpellMapTargeting } from "./useSpellMapTargeting";

export { useBonusSpells, useReactionSpells,useSpellBookPrefetch } from "./useBattleSpellLibrary";
import { poolLeft } from "@/lib/utils/abilities/engine/core/usage";
import { reactionBlocker } from "@/lib/utils/battle/actions/reaction";
import {
  buildSpellPick,
  casterUsesUniversalSlot,
  initialSpellFlow,
  slotOptions,
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
import { spellFormulaLabel } from "@/lib/utils/battle/spell/caster-dice";
import { skillAllTargets, spellChain } from "@/lib/utils/battle/spell/spell-targeting";
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

  const byLevel = groupSpellsByLevel(spells);

  const levels = levelsWithSpells(byLevel);

  if (flow.step === "book" && !flow.levelPinned && levels.length > 0 && !levels.includes(flow.level)) {
    dispatch({ type: "SPELLS_LOADED", levels });
  }

  const selected = spells.find((s) => s.id === flow.pick?.spellId) ?? null;

  const order = scene.battle.initiativeOrder;

  if (flow.step === "book" && special && spells[0]) {
    dispatch({ type: "PICK", pick: buildSpellPick(order, caster, spells[0], scene.battle.map ?? null, { castLevel: caster?.spellcasting.grants?.find((g) => g.spellId === special.spellId)?.castLevel }) });
  }

  const map = scene.battle.map ?? null;

  const { visible } = useModeView();

  const targets = spellTargetCandidates(order, caster, flow.pick?.targetMode === "template" ? undefined : flow.pick?.targetSide).filter(visible);

  const inRange = (t: BattleParticipant) => spellTargetInRange(map, caster, t, flow.pick?.range);

  const aimPick = flow.pick?.targetMode === "template" ? flow.pick : undefined;

  const touchedAt = (cell: GridPoint | null | undefined) => {
    const aim = aimPick?.template?.shape === "emanation" ? caster?.battleData.position : cell;

    return map && caster && aimPick && aim ? spellAimTargets({ map, participants: order, caster }, aimPick, aim) : [];
  };

  const onMap = !!map && !!caster && isOnMap(caster);

  // полеглі зникають з карти — воскресіння обирає ціль зі списку у вікні

  const mapTargeting = flow.step === "targets" && onMap && flow.pick?.targetSide !== "dead";

  const hover = useSpellMapTargeting(flow, dispatch, {
    caster, order, map, active: mapTargeting, candidates: targets.filter(isOnMap), inRange, setMapAim: scene.intents.setMapAim, setMapPick: scene.intents.setMapPick,
  });

  const aimPreview = hover && caster ? { targets: touchedAt(hover).filter(visible).map((p) => ({ participant: p, ally: p.basicInfo.side === caster.basicInfo.side })) } : null;

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

  const formulaOf = (s: BookSpell): string =>
    caster ? spellFormulaLabel(caster, { dice: spellDefinition(s).dice, groupId: s.spellGroup?.id ?? null, level: s.level, dieSides: s.dieSides, upcastDice: s.upcastDice, fixedDice: s.fixedDice }, castLevelOf(s)) : "";

  const grantsOf = (s: BookSpell) => (caster?.spellcasting.grants ?? []).filter((g) => g.spellId === s.id);

  const grantOf = (s: BookSpell) => {
    if (flow.slotKey) return undefined;

    const grants = grantsOf(s);

    return grants.find((g) => g.key && g.key === flow.grantKey) ?? (flow.grantKey ? undefined : grants.length === 1 ? grants[0] : undefined);
  };

  const canSlot = (s: BookSpell) => {
    const grants = grantsOf(s);

    return caster?.spellcasting.slotSpells?.includes(s.id) || grants.length === 0 || grants.some((g) => g.via === "slotOrGrant");
  };

  const grantLabel = (s: BookSpell): string | undefined => {
    const grants = grantsOf(s);

    if (grants.length === 0 || !caster) return undefined;

    return grants.map((grant) => {
      const pool = grant.pool && caster.battleData.pools?.[grant.pool];

      const usage = pool ? `${poolLeft(caster, grant.pool as string) ?? 0}/${pool.max}${pool.recharge ? ` · ⟳ ${pool.recharge}–6` : " за відпочинок"}` : "За бажанням";

      return `${grant.label ?? "Грант"}: ${grant.legendaryOnly ? "Лише легендарна / лігво · " : ""}${usage}`;
    }).join(" · ");
  };

  const slotChoices = selected && !bypassCost && canSlot(selected) ? slotOptions(caster, selected.level) : [];

  const sourceOptions = selected && grantsOf(selected).length > 0 ? [
    ...slotChoices.map((slot) => ({ value: `slot:${slot.key}`, label: `Слот ${slot.label}`, disabled: false })),
    ...grantsOf(selected).map((grant) => {
      const pool = grant.pool && caster?.battleData.pools?.[grant.pool];

      const remaining = grant.pool && caster ? poolLeft(caster, grant.pool) ?? 0 : null;

      return { value: `grant:${grant.key ?? grant.spellId}`, label: `${grant.label ?? "Безкоштовний каст"}${pool ? ` · ${remaining}/${pool.max}` : " · без ліміту"}`, disabled: pool !== undefined && (remaining ?? 0) < (grant.cost ?? 1) };
    }),
  ] : [];

  const selectedGrant = selected ? grantOf(selected) : undefined;

  const upcast = selectedGrant?.upcast;

  const baseCastLevel = selectedGrant?.castLevel;

  const castLevelOptions = upcast && baseCastLevel !== undefined
    ? Array.from({ length: upcast.maxLevel - baseCastLevel + 1 }, (_, i) => {
      const level = baseCastLevel + i;

      const cost = (selectedGrant.cost ?? 1) + i * upcast.extraCost;

      const left = selectedGrant.pool && caster ? poolLeft(caster, selectedGrant.pool) ?? 0 : Infinity;

      return { value: level, label: `Коло ${level}${i ? ` · ${cost} заряди` : ""}`, disabled: left < cost };
    })
    : [];

  const send = useEffectEvent(async () => {
    if (!caster) return;

    try {
      const res = await scene.actions.castSpell.mutateAsync({ ...spellPayload(state), ...(free && { free: true }), ...(special && { legendaryKey: special.abilityKey }), ...(finishLong && caster.battleData.pendingCast && { castingRounds: caster.battleData.pendingCast.remainingRounds }) });

      dispatch({ type: "SUCCESS" });
      scene.result.show({ kind: "spell", spellName: selected?.name ?? "Заклинання", changes: hpTotals(res?.hpChanges ?? []), targetCount: state.targetIds.length });
      options.onDone?.();
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : "Не вдалося застосувати заклинання" });
    }
  });

  useEffect(() => {
    if (state.step === "submitting") void send();
  }, [state.step]);

  const firstUsable = (who: BattleParticipant) => slotLevels(who).find((l) => l.current > 0)?.level ?? 0;

  const view = {
    spells, byLevel, selected, targets, saveTargets, aimPreview, mapTargeting, chain: chain.filter(visible), inRange, formulaOf, wideningOf, definitionOf: spellDefinition, slots: caster ? slotLevels(caster) : [],
    universalSlot,
    free,
    timing: selected?.casting,
    pendingCast: caster?.battleData.pendingCast,
    canFastForward: scene.viewer.isDM,
    grantLabel,
    sourceOptions,
    sourceValue: flow.grantKey ? `grant:${flow.grantKey}` : flow.slotKey ? `slot:${flow.slotKey}` : "",
    castLevelOptions,
    castLevelValue: flow.castLevel ?? selectedGrant?.castLevel,
    slotLeft: (level: number) => spellSlotsLeft(caster, level, bypassCost || spells.some((s) => s.level === level && !!grantOf(s))),
    slotCostLabel: (s: BookSpell) => [special ? "Легендарна дія / дія лігва" : undefined, grantLabel(s)].filter(Boolean).join(" · ") || spellSlotCostLabel(s, { free, universal: universalSlot, chosen: slotChoices.find((o) => o.key === state.slotKey)?.label }),
    slot: { options: slotChoices, value: state.slotKey },
    noSlot: (s: BookSpell) => !canSlot(s) && spellBlockedBySlots(caster, s.level, bypassCost),
    attackTargets: state.pick?.needsAttackRolls ? targets.filter((t) => state.targetIds.includes(t.basicInfo.id)) : [],
    costUsed: (s: BookSpell) => {
      const grant = grantOf(s);

      if (!caster || free) return false;

      if (!scene.viewer.isDM && s.cost !== "reaction" && scene.battle.initiativeOrder[scene.battle.currentTurnIndex]?.basicInfo.id !== caster.basicInfo.id) return true;

      if (s.cost === "reaction" && reactionBlocker(caster)) return true;

      if (grantsOf(s).length > 0 && !grant && !state.slotKey) return true;

      if (grant?.legendaryOnly && !special) return true;

      if (grant?.pool && (poolLeft(caster, grant.pool) ?? 0) < (grant.cost ?? 1)) return true;

      return !bypassCost && (spellDefinition(s).cost === "reaction" ? caster.actionFlags.hasUsedReaction : spellDefinition(s).cost === "bonusAction" ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction);
    },
  };

  const actions = {
    open: (level?: number, casterOverride?: BattleParticipant) => {
      const who = casterOverride ?? caster;

      if (who) dispatch({ type: "OPEN", casterId: who.basicInfo.id, level: level ?? firstUsable(who), levels });
    },
    setLevel: (level: number) => dispatch({ type: "SET_LEVEL", level }),
    pick: (s: BookSpell) => {
      const grants = (caster?.spellcasting.grants ?? []).filter((g) => g.spellId === s.id);

      const grant = grants.length === 1 ? grants[0] : undefined;

      const choices = !bypassCost && canSlot(s) ? slotOptions(caster, s.level) : [];

      const first = grants.length === 0 ? choices[0] : undefined;

      const defaultGrant = grant && (!choices.length || grant.via !== "slotOrGrant" || s.level === 0) ? grant : undefined;

      dispatch({ type: "PICK", pick: buildSpellPick(order, caster, s, map, { castLevel: defaultGrant?.castLevel ?? first?.castLevel }), ...(first && { slotKey: first.key }), ...(defaultGrant?.key && { grantKey: defaultGrant.key }), ...(defaultGrant?.upcast && defaultGrant.castLevel !== undefined && { castLevel: defaultGrant.castLevel }) });
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
