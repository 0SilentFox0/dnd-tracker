"use client";

import { useEffect, useEffectEvent, useMemo, useReducer } from "react";

import { useBattleScene } from "./useBattleScene";

import { usePrefetchSpellsByIds, useSpells, useSpellsByIds } from "@/lib/hooks/spells";
import {
  buildSpellPick,
  casterUsesUniversalSlot,
  initialSpellFlow,
  spellDefinition,
  spellFlow,
  spellPayload,
  spellSaveTargets,
  spellSlotCostLabel,
  spellSlotsLeft,
  spellSpec,
  spellTargetCandidates,
} from "@/lib/utils/battle/flows";
import { spellFormulaLabel } from "@/lib/utils/battle/spell/caster-dice";
import { expandSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import { slotLevels } from "@/lib/utils/battle/view";
import { cryptoRandom, rollDie } from "@/lib/utils/common/dice";
import { groupSpellsByLevel } from "@/lib/utils/spells/group-by-level";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export type { BookSpell };

const NO_SPELLS: string[] = [];

/** Відомі закляття одним набором: DM бачить усіх учасників, гравець лише своїх (без витоку ворожих і без рефетчу при кожному призові). */
function useBattleSpellIds(): string[] {
  const { battle, isDM, myParticipants } = useBattleScene();

  const source = isDM ? battle.initiativeOrder : myParticipants;

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

export function useSpellBook(caster: BattleParticipant | null, options: { allSpells?: boolean; onDone?: () => void } = {}) {
  const scene = useBattleScene();

  const [state, dispatch] = useReducer(spellFlow, initialSpellFlow);

  const isOpen = state.step !== "closed" && !!caster;

  const free = !!options.allSpells;

  const library = useSpells(scene.campaignId, { enabled: isOpen && free });

  const known = useSpellsByIds(scene.campaignId, useBattleSpellIds(), { enabled: isOpen && !free });

  const spells = useMemo(() => (free ? ((library.data ?? []) as BookSpell[]) : knownBy(known.data, caster)), [free, library.data, known.data, caster]);

  const byLevel = useMemo(() => groupSpellsByLevel(spells), [spells]);

  const levels = useMemo(() => levelsWithSpells(byLevel), [byLevel]);

  if (state.step === "book" && !state.levelPinned && levels.length > 0 && !levels.includes(state.level)) {
    dispatch({ type: "SPELLS_LOADED", levels });
  }

  const selected = spells.find((s) => s.id === state.pick?.spellId) ?? null;

  const order = scene.battle.initiativeOrder;

  const targets = spellTargetCandidates(order, caster, state.pick?.targetSide);

  const saveTargets = spellSaveTargets(targets, state, scene);

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

  return {
    state, spells, byLevel, selected, targets, saveTargets, formulaOf, definitionOf: spellDefinition, slots: caster ? slotLevels(caster) : [],
    allCount: state.pick?.targetMode === "all" ? state.targetIds.length : 0,
    universalSlot,
    free,
    slotLeft: (level: number) => spellSlotsLeft(caster, level, free),
    slotCostLabel: (s: BookSpell) => spellSlotCostLabel(s, { free, universal: universalSlot }),
    costUsed: (s: BookSpell) => !!caster && !free && (spellDefinition(s).cost === "bonusAction" ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction),
    open: (level?: number, casterOverride?: BattleParticipant) => {
      const who = casterOverride ?? caster;

      if (who) dispatch({ type: "OPEN", casterId: who.basicInfo.id, level: level ?? firstUsable(who), levels });
    },
    setLevel: (level: number) => dispatch({ type: "SET_LEVEL", level }),
    pick: (s: BookSpell) => dispatch({ type: "PICK", pick: buildSpellPick(order, caster, s) }),
    toTargets: () => dispatch({ type: "TO_TARGETS" }),
    toggleTarget: (id: string) => {
      const expanded =
        state.pick?.targetMode === "all" && caster && selected
          ? expandSpellTargets(order, caster.basicInfo.id, spellSpec(selected), [id])
          : undefined;

      dispatch({ type: "TOGGLE_TARGET", id, expanded });
    },
    confirmTargets: () => dispatch({ type: "CONFIRM_TARGETS" }),
    setSave: (id: string, v: number | undefined) => dispatch({ type: "SET_SAVE", id, value: v }),
    setDamage: (i: number, v: number | undefined) => dispatch({ type: "SET_DAMAGE", index: i, value: v }),
    aiDamage: () => state.pick?.diceSlots.forEach((sides, i) => dispatch({ type: "SET_DAMAGE", index: i, value: rollDie(sides, cryptoRandom) })),
    toSummary: () => dispatch({ type: "TO_SUMMARY" }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };
}
