"use client";

import { type Dispatch, useCallback, useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from "react";

import { useModeView } from "./modes/useModeView";
import { useBattleScene } from "./useBattleScene";

import { usePrefetchSpellsByIds, useSpells, useSpellsByIds } from "@/lib/hooks/spells";
import { isFiveE } from "@/lib/utils/battle/attack/ability";
import {
  buildSpellPick,
  casterUsesUniversalSlot,
  initialSpellFlow,
  slotOptions,
  spellAimTargets,
  spellDefinition,
  spellFlow,
  type SpellFlowAction,
  type SpellFlowState,
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
import { isOnMap, type MapAim, type MapPick } from "@/lib/utils/battle/grid";
import { modeSightedTargets } from "@/lib/utils/battle/modes/engine";
import { spellFormulaLabel } from "@/lib/utils/battle/spell/caster-dice";
import { skillAllTargets, spellChain } from "@/lib/utils/battle/spell/spell-targeting";
import { slotLevels } from "@/lib/utils/battle/view";
import { cryptoRandom, rollDie } from "@/lib/utils/common/dice";
import { groupSpellsByLevel } from "@/lib/utils/spells/group-by-level";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export type { BookSpell };

const NO_SPELLS: string[] = [];

/** Сумарна зміна HP на учасника: шкода > 0, лікування < 0. */
function hpTotals(changes: { participantId: string; participantName: string; change: number }[]): { name: string; change: number }[] {
  const byId = new Map<string, { name: string; change: number }>();

  for (const c of changes) {
    const kept = byId.get(c.participantId);

    byId.set(c.participantId, { name: c.participantName, change: (kept?.change ?? 0) + c.change });
  }

  return [...byId.values()].filter((c) => c.change !== 0);
}

/** Відомі закляття одним набором: DM бачить усіх учасників, гравець лише своїх (без витоку ворожих і без рефетчу при кожному призові). */
function useBattleSpellIds(): string[] {
  const { battle, viewer, roster } = useBattleScene();

  const source = viewer.isDM ? battle.initiativeOrder : roster.myParticipants;

  const key = useMemo(() => [...new Set(source.flatMap((p) => p.spellcasting?.knownSpells ?? []))].sort().join(","), [source]);

  return useMemo(() => (key ? key.split(",") : NO_SPELLS), [key]);
}

const knownBy = (spells: BookSpell[] | undefined, who: BattleParticipant | null) => {
  const ids = new Set(who?.spellcasting.knownSpells ?? []);

  return (spells ?? []).filter((s) => ids.has(s.id));
};

/** Прогріває закляття бою, поки він простоює. */
export function useSpellBookPrefetch() {
  const { campaignId } = useBattleScene();

  usePrefetchSpellsByIds(campaignId, useBattleSpellIds());
}

const BONUS_NONE: BookSpell[] = [];

/** Відомі гравцеві заклинання за бонусну дію (з кешу книги, яку прогріває useSpellBookPrefetch). */
export function useBonusSpells(hero: BattleParticipant): BookSpell[] {
  const { campaignId } = useBattleScene();

  const known = useSpellsByIds(campaignId, useBattleSpellIds());

  return useMemo(() => {
    const bonus = knownBy(known.data, hero).filter((s) => s.cost === "bonusAction");

    return bonus.length ? bonus : BONUS_NONE;
  }, [known.data, hero]);
}

const levelsWithSpells = (byLevel: Record<number, BookSpell[]>) =>
  Object.keys(byLevel).map(Number).filter((l) => byLevel[l].length > 0);

interface MapTargetingContext {
  caster: BattleParticipant | null;
  order: BattleParticipant[];
  map: BattleMapConfig | null;
  active: boolean;
  candidates: BattleParticipant[];
  inRange(t: BattleParticipant): boolean;
  setMapAim(aim: MapAim | null): void;
  setMapPick(pick: MapPick | null): void;
}

/** Крок цілей на карті: шаблон приймає точку наведення, решта — клік по токену; ховер віддає точку прев'ю, Escape скасовує. */
function useSpellMapTargeting(state: SpellFlowState, dispatch: Dispatch<SpellFlowAction>, ctx: MapTargetingContext) {
  const { caster, order, map, active, candidates, inRange, setMapAim, setMapPick } = ctx;

  const aimAt = useRef<(cell: GridPoint) => void>(() => undefined);

  const pickAt = useRef<(id: string) => void>(() => undefined);

  const latest = useRef({ candidates, inRange });

  const [hover, setHover] = useState<GridPoint | null>(null);

  useEffect(() => {
    latest.current = { candidates, inRange };
    aimAt.current = (cell) => {
      if (!map || !caster || !state.pick) return;

      const ids = spellAimTargets({ map, participants: order, caster }, state.pick, cell).map((p) => p.basicInfo.id);

      dispatch({ type: "SET_AIM", aim: cell, targetIds: ids });
      // клік у межах дальності і є підтвердженням, навіть якщо зона нікого не зачепила
      dispatch({ type: "CONFIRM_TARGETS" });
    };
    pickAt.current = (id) => {
      const target = order.find((p) => p.basicInfo.id === id);

      if (target && inRange(target)) dispatch({ type: "PICK_TARGET", id });
    };
  });

  const onAim = useCallback((cell: GridPoint) => aimAt.current(cell), []);

  const onPick = useCallback((id: string) => pickAt.current(id), []);

  const template = active && state.pick?.targetMode === "template" ? state.pick.template : undefined;

  const picking = active && !!state.pick && state.pick.targetMode !== "template";

  const range = state.pick?.range;

  const casterId = caster?.basicInfo.id;

  useEffect(() => {
    if (!template || !casterId) return;

    setMapAim({ template, casterId, ...(range !== undefined && { range }), ...(state.aim && { aim: state.aim }), onAim, onHover: setHover });

    return () => {
      setMapAim(null);
      setHover(null);
    };
  }, [template, casterId, range, state.aim, onAim, setMapAim]);

  const pickSignature = picking ? candidates.map((p) => `${p.basicInfo.id}${inRange(p) ? "+" : "-"}`).join(",") : "";

  const pickedIds = state.targetIds.join(",");

  useEffect(() => {
    if (!picking || !casterId) return;

    const { candidates: list, inRange: reach } = latest.current;

    setMapPick({ casterId, targets: list.map((p) => ({ id: p.basicInfo.id, reachable: reach(p) })), selectedIds: pickedIds ? pickedIds.split(",") : [], onPick });

    return () => setMapPick(null);
  }, [picking, casterId, pickSignature, pickedIds, onPick, setMapPick]);

  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "CLOSE" });
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [active, dispatch]);

  return template ? hover : null;
}

export function useSpellBook(caster: BattleParticipant | null, options: { allSpells?: boolean; onDone?: () => void } = {}) {
  const scene = useBattleScene();

  const [flow, dispatch] = useReducer(spellFlow, initialSpellFlow);

  const isOpen = flow.step !== "closed" && !!caster;

  const free = !!options.allSpells;

  const library = useSpells(scene.campaignId, { enabled: isOpen && free });

  const known = useSpellsByIds(scene.campaignId, useBattleSpellIds(), { enabled: isOpen && !free });

  const spells = useMemo(() => (free ? ((library.data ?? []) as BookSpell[]) : knownBy(known.data, caster)), [free, library.data, known.data, caster]);

  const byLevel = useMemo(() => groupSpellsByLevel(spells), [spells]);

  const levels = useMemo(() => levelsWithSpells(byLevel), [byLevel]);

  if (flow.step === "book" && !flow.levelPinned && levels.length > 0 && !levels.includes(flow.level)) {
    dispatch({ type: "SPELLS_LOADED", levels });
  }

  const selected = spells.find((s) => s.id === flow.pick?.spellId) ?? null;

  const order = scene.battle.initiativeOrder;

  const map = scene.battle.map ?? null;

  const { visible } = useModeView();

  const targets = spellTargetCandidates(order, caster, flow.pick?.targetMode === "template" ? undefined : flow.pick?.targetSide).filter(visible);

  const inRange = (t: BattleParticipant) => spellTargetInRange(map, caster, t, flow.pick?.range);

  const aimPick = flow.pick?.targetMode === "template" ? flow.pick : undefined;

  const touchedAt = (cell: GridPoint | null | undefined) => (map && caster && aimPick && cell ? spellAimTargets({ map, participants: order, caster }, aimPick, cell) : []);

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
    if (!caster || !flow.slotKey || flow.pick?.spellId !== s.id) return undefined;

    return slotOptions(caster, s.level).find((o) => o.key === flow.slotKey)?.castLevel;
  };

  const formulaOf = (s: BookSpell): string =>
    caster ? spellFormulaLabel(caster, { dice: spellDefinition(s).dice, groupId: s.spellGroup?.id ?? null, level: s.level, dieSides: s.dieSides, upcastDice: s.upcastDice }, castLevelOf(s)) : "";

  const slotChoices = selected && !free ? slotOptions(caster, selected.level) : [];

  const send = useEffectEvent(async () => {
    if (!caster) return;

    try {
      const res = await scene.actions.castSpell.mutateAsync({ ...spellPayload(state), ...(free && { free: true }) });

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
    slotLeft: (level: number) => spellSlotsLeft(caster, level, free),
    slotCostLabel: (s: BookSpell) => spellSlotCostLabel(s, { free, universal: universalSlot, chosen: slotChoices.find((o) => o.key === state.slotKey)?.label }),
    slot: { options: slotChoices, value: state.slotKey },
    noSlot: (s: BookSpell) => (caster && isFiveE(caster) ? !free && s.level > 0 && slotOptions(caster, s.level).length === 0 : false),
    attackTargets: state.pick?.needsAttackRolls ? targets.filter((t) => state.targetIds.includes(t.basicInfo.id)) : [],
    costUsed: (s: BookSpell) => !!caster && !free && (spellDefinition(s).cost === "bonusAction" ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction),
  };

  const actions = {
    open: (level?: number, casterOverride?: BattleParticipant) => {
      const who = casterOverride ?? caster;

      if (who) dispatch({ type: "OPEN", casterId: who.basicInfo.id, level: level ?? firstUsable(who), levels });
    },
    setLevel: (level: number) => dispatch({ type: "SET_LEVEL", level }),
    pick: (s: BookSpell) => {
      const first = free ? undefined : slotOptions(caster, s.level)[0];

      dispatch({ type: "PICK", pick: buildSpellPick(order, caster, s, map, { castLevel: first?.castLevel }), ...(first && { slotKey: first.key }) });
    },
    setSlot: (key: string) => {
      const option = selected && slotChoices.find((o) => o.key === key);

      if (selected && option) dispatch({ type: "SET_SLOT", slotKey: key, pick: buildSpellPick(order, caster, selected, map, { castLevel: option.castLevel }) });
    },
    setAttack: (id: string, v: number | undefined) => dispatch({ type: "SET_ATTACK", id, value: v }),
    toTargets: () => dispatch({ type: "TO_TARGETS" }),
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
