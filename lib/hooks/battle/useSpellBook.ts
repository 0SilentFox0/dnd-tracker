"use client";

import { useEffect, useEffectEvent, useMemo, useReducer, useRef } from "react";

import { rollDie } from "./useAttackWizard";
import { useBattleScene } from "./useBattleScene";

import { usePrefetchSpellsByIds, useSpells, useSpellsByIds } from "@/lib/hooks/spells";
import { initialSpellFlow, spellFlow, spellPayload,type SpellPick } from "@/lib/utils/battle/flows";
import { isUp } from "@/lib/utils/battle/participant/state";
import { casterSpellDice, spellFormulaLabel } from "@/lib/utils/battle/spell/caster-dice";
import { expandSpellTargets, spellTargetingFor } from "@/lib/utils/battle/spell/spell-targeting";
import { slotLevels } from "@/lib/utils/battle/view";
import { groupSpellsByLevel } from "@/lib/utils/spells/group-by-level";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export type { BookSpell };

const NO_SPELLS: string[] = [];

/** Усі відомі закляття учасників бою одним набором: один запит і один кеш на бій, кожен кастер фільтрує свої. */
function useBattleSpellIds(): string[] {
  const { battle } = useBattleScene();

  const key = [...new Set(battle.initiativeOrder.flatMap((p) => p.spellcasting?.knownSpells ?? []))].sort().join(",");

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

export function useSpellBook(caster: BattleParticipant | null, options: { allSpells?: boolean; onDone?: () => void } = {}) {
  const scene = useBattleScene();

  const [state, dispatch] = useReducer(spellFlow, initialSpellFlow);

  const isOpen = state.step !== "closed" && !!caster;

  const library = useSpells(scene.campaignId, { enabled: isOpen && !!options.allSpells });

  const known = useSpellsByIds(scene.campaignId, useBattleSpellIds(), { enabled: isOpen && !options.allSpells });

  const spells = useMemo(() => (options.allSpells ? ((library.data ?? []) as BookSpell[]) : knownBy(known.data, caster)), [options.allSpells, library.data, known.data, caster]);

  const byLevel = useMemo(() => groupSpellsByLevel(spells), [spells]);

  // закляття юніта вантажаться вже після відкриття: раз за відкриття переходимо з порожнього кола на перше, де вони є
  const leveled = useRef(false);

  useEffect(() => {
    if (state.step === "closed") {
      leveled.current = false;

      return;
    }

    if (state.step !== "book" || leveled.current || spells.length === 0) return;

    leveled.current = true;

    if (byLevel[state.level]?.length) return;

    const first = Object.keys(byLevel).map(Number).sort((a, b) => a - b).find((l) => byLevel[l].length > 0);

    if (first !== undefined) dispatch({ type: "SET_LEVEL", level: first });
  }, [state.step, state.level, spells, byLevel]);

  const selected = spells.find((s) => s.id === state.pick?.spellId) ?? null;

  const order = scene.battle.initiativeOrder;

  const definitionOf = (s: BookSpell) => ({
    dice: s.dice ?? 0,
    cost: s.cost ?? "action",
    targeting: s.targeting ?? ({ kind: "enemy" } as const),
    resolution: s.resolution ?? ({ kind: "auto" } as const),
  });

  const specOf = (s: BookSpell) => ({ id: s.id, groupId: s.spellGroup?.id ?? null, level: s.level });

  const targetSide = (s: BookSpell | null): SpellPick["targetSide"] => {
    const t = s ? definitionOf(s).targeting : null;

    if (!t) return undefined;

    if (t.kind === "allyDead") return "dead";

    return t.kind === "ally" ? "ally" : t.kind === "enemy" ? "enemy" : t.kind === "area" ? t.side : undefined;
  };

  const targets = order.filter((p) => {
    const side = state.pick?.targetSide;

    if (!side || !caster) return isUp(p);

    const mine = p.basicInfo.side === caster.basicInfo.side;

    return side === "dead" ? mine && !isUp(p) : isUp(p) && (side === "ally" ? mine : !mine);
  });

  const pickOf = (s: BookSpell): SpellPick => {
    const def = definitionOf(s);

    const { targeting } = def;

    const skill = caster && (targeting.kind === "ally" || targeting.kind === "enemy") ? spellTargetingFor(order, caster.basicInfo.id, specOf(s)) : { mode: "single" as const, maxTargets: 1 };

    const auto = ["self", "allAllies", "allAlliesDead", "allEnemies", "everyone"].includes(targeting.kind);

    const targetMode: SpellPick["targetMode"] = auto ? "none" : targeting.kind === "area" ? "multi" : skill.mode === "all" ? "all" : skill.mode === "area" ? "multi" : "single";

    const maxTargets = targeting.kind === "area" ? targeting.maxTargets : skill.mode === "area" ? skill.maxTargets : undefined;

    const dice = caster ? casterSpellDice(caster, { dice: def.dice, groupId: s.spellGroup?.id ?? null }) : { count: def.dice, sides: 6 };

    return {
      spellId: s.id,
      level: s.level,
      targetMode,
      targetSide: targetSide(s),
      maxTargets,
      needsSaves: def.resolution.kind === "save" && !auto,
      diceSlots: Array.from({ length: dice.count }, () => dice.sides),
    };
  };

  const formulaOf = (s: BookSpell): string => (caster ? spellFormulaLabel(caster, { dice: definitionOf(s).dice, groupId: s.spellGroup?.id ?? null }) : "");

  const saveTargets = state.pick?.needsSaves ? targets.filter((t) => state.targetIds.includes(t.basicInfo.id) && (scene.isDM || t.basicInfo.controlledBy === scene.userId)) : [];

  const allCount = state.pick?.targetMode === "all" ? state.targetIds.length : 0;

  const send = useEffectEvent(async () => {
    if (!caster) return;

    try {
      await scene.actions.castSpell.mutateAsync(spellPayload(state));
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
    state, spells, byLevel, selected, targets, saveTargets, allCount, formulaOf, definitionOf, slots: caster ? slotLevels(caster) : [],
    // юніт кастує з універсального слота (лише в юнітів, як у castSpell), герой — зі слота кола
    universalSlot: !!caster?.spellcasting.spellSlots.universal,
    slotLeft: (level: number) =>
      level === 0 || !caster ? Infinity : (caster.spellcasting.spellSlots.universal?.current ?? slotLevels(caster).find((s) => s.level === level)?.current ?? 0),
    costUsed: (s: BookSpell) => !!caster && (definitionOf(s).cost === "bonusAction" ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction),
    open: (level?: number, casterOverride?: BattleParticipant) => {
      const who = casterOverride ?? caster;

      if (who) dispatch({ type: "OPEN", casterId: who.basicInfo.id, level: level ?? firstUsable(who) });
    },
    setLevel: (level: number) => dispatch({ type: "SET_LEVEL", level }),
    pick: (s: BookSpell) => dispatch({ type: "PICK", pick: pickOf(s) }),
    toTargets: () => dispatch({ type: "TO_TARGETS" }),
    toggleTarget: (id: string) => {
      const expanded =
        state.pick?.targetMode === "all" && caster && selected
          ? expandSpellTargets(order, caster.basicInfo.id, specOf(selected), [id])
          : undefined;

      dispatch({ type: "TOGGLE_TARGET", id, expanded });
    },
    confirmTargets: () => dispatch({ type: "CONFIRM_TARGETS" }),
    setSave: (id: string, v: number | undefined) => dispatch({ type: "SET_SAVE", id, value: v }),
    setDamage: (i: number, v: number | undefined) => dispatch({ type: "SET_DAMAGE", index: i, value: v }),
    aiDamage: () => state.pick?.diceSlots.forEach((sides, i) => dispatch({ type: "SET_DAMAGE", index: i, value: rollDie(sides) })),
    toSummary: () => dispatch({ type: "TO_SUMMARY" }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };
}
