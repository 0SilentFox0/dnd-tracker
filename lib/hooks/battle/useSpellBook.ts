"use client";

import { type Dispatch, useCallback, useEffect, useEffectEvent, useMemo, useReducer, useRef } from "react";

import { useBattleScene } from "./useBattleScene";

import { usePrefetchSpellsByIds, useSpells, useSpellsByIds } from "@/lib/hooks/spells";
import {
  buildSpellPick,
  casterUsesUniversalSlot,
  initialSpellFlow,
  spellDefinition,
  spellFlow,
  type SpellFlowAction,
  type SpellFlowState,
  spellPayload,
  spellSaveTargets,
  spellSlotCostLabel,
  spellSlotsLeft,
  spellSpec,
  spellTargetCandidates,
  spellTargetInRange,
  withLiveAimTargets,
} from "@/lib/utils/battle/flows";
import { type MapAim, templateArea } from "@/lib/utils/battle/grid";
import { spellFormulaLabel } from "@/lib/utils/battle/spell/caster-dice";
import { expandSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import { slotLevels } from "@/lib/utils/battle/view";
import { cryptoRandom, rollDie } from "@/lib/utils/common/dice";
import { groupSpellsByLevel } from "@/lib/utils/spells/group-by-level";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export type { BookSpell };

const NO_SPELLS: string[] = [];

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

/** Поки майстер на кроці цілей шаблону, карта приймає точку наведення замість руху чи атаки. */
function useSpellMapAim(
  state: SpellFlowState,
  dispatch: Dispatch<SpellFlowAction>,
  ctx: { caster: BattleParticipant | null; order: BattleParticipant[]; map: BattleMapConfig | null; setMapAim(aim: MapAim | null): void },
) {
  const { caster, order, map, setMapAim } = ctx;

  const aimAt = useRef<(cell: GridPoint) => void>(() => undefined);

  useEffect(() => {
    aimAt.current = (cell) => {
      const template = state.pick?.template;

      if (!map || !caster || !template) return;

      const ids = templateArea(map, order, caster, template, cell).targets.map((p) => p.basicInfo.id);

      dispatch({ type: "SET_AIM", aim: cell, targetIds: ids });
    };
  });

  const onAim = useCallback((cell: GridPoint) => aimAt.current(cell), []);

  const template = state.step === "targets" && state.pick?.targetMode === "template" ? state.pick.template : undefined;

  const range = state.pick?.range;

  const casterId = caster?.basicInfo.id;

  useEffect(() => {
    if (!template || !casterId) return;

    setMapAim({ template, casterId, ...(range !== undefined && { range }), ...(state.aim && { aim: state.aim }), onAim });

    return () => setMapAim(null);
  }, [template, casterId, range, state.aim, onAim, setMapAim]);

  useEffect(() => {
    if (!template) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "CLOSE" });
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [template, dispatch]);
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

  const targets = spellTargetCandidates(order, caster, flow.pick?.targetMode === "template" ? undefined : flow.pick?.targetSide);

  const inRange = (t: BattleParticipant) => spellTargetInRange(map, caster, t, flow.pick?.range);

  const aimTemplate = flow.pick?.targetMode === "template" ? flow.pick.template : undefined;

  // від точки, а не від id на момент кліку: рух до касту змінює, кого зачепить
  const aimTargets = map && caster && aimTemplate && flow.aim
    ? templateArea(map, order, caster, aimTemplate, flow.aim).targets.map((p) => ({ participant: p, ally: p.basicInfo.side === caster.basicInfo.side }))
    : [];

  const state = withLiveAimTargets(flow, aimTargets.map((t) => t.participant.basicInfo.id));

  useSpellMapAim(flow, dispatch, { caster, order, map, setMapAim: scene.intents.setMapAim });

  const saveTargets = spellSaveTargets(targets, state, scene.viewer);

  const universalSlot = casterUsesUniversalSlot(caster);

  const formulaOf = (s: BookSpell): string => (caster ? spellFormulaLabel(caster, { dice: spellDefinition(s).dice, groupId: s.spellGroup?.id ?? null }) : "");

  const send = useEffectEvent(async () => {
    if (!caster) return;

    try {
      await scene.actions.castSpell.mutateAsync({ ...spellPayload(state), ...(free && { free: true }) });
      dispatch({ type: "SUCCESS" });
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
    spells, byLevel, selected, targets, saveTargets, aimTargets, inRange, formulaOf, definitionOf: spellDefinition, slots: caster ? slotLevels(caster) : [],
    aimConfirmable: !!state.aim && (aimTargets.length > 0 || !!state.pick?.zone),
    allCount: state.pick?.targetMode === "all" ? state.targetIds.length : 0,
    universalSlot,
    free,
    slotLeft: (level: number) => spellSlotsLeft(caster, level, free),
    slotCostLabel: (s: BookSpell) => spellSlotCostLabel(s, { free, universal: universalSlot }),
    costUsed: (s: BookSpell) => !!caster && !free && (spellDefinition(s).cost === "bonusAction" ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction),
  };

  const actions = {
    open: (level?: number, casterOverride?: BattleParticipant) => {
      const who = casterOverride ?? caster;

      if (who) dispatch({ type: "OPEN", casterId: who.basicInfo.id, level: level ?? firstUsable(who), levels });
    },
    setLevel: (level: number) => dispatch({ type: "SET_LEVEL", level }),
    pick: (s: BookSpell) => dispatch({ type: "PICK", pick: buildSpellPick(order, caster, s, map) }),
    toTargets: () => dispatch({ type: "TO_TARGETS" }),
    toggleTarget: (id: string) => {
      const target = order.find((p) => p.basicInfo.id === id);

      if (target && !inRange(target)) return;

      const expanded =
        state.pick?.targetMode === "all" && caster && selected
          ? expandSpellTargets(order, caster.basicInfo.id, spellSpec(selected), [id])
          : undefined;

      dispatch({ type: "TOGGLE_TARGET", id, expanded });
    },
    confirmTargets: () => {
      if (state !== flow && state.aim) dispatch({ type: "SET_AIM", aim: state.aim, targetIds: state.targetIds });

      dispatch({ type: "CONFIRM_TARGETS" });
    },
    setSave: (id: string, v: number | undefined) => dispatch({ type: "SET_SAVE", id, value: v }),
    setDamage: (i: number, v: number | undefined) => dispatch({ type: "SET_DAMAGE", index: i, value: v }),
    aiDamage: () => state.pick?.diceSlots.forEach((sides, i) => dispatch({ type: "SET_DAMAGE", index: i, value: rollDie(sides, cryptoRandom) })),
    toSummary: () => dispatch({ type: "TO_SUMMARY" }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };

  return { state, view, actions };
}
