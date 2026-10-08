"use client";

import { useEffect, useEffectEvent, useMemo, useReducer } from "react";

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

/** Прогріває книгу заклинань героя гравця, поки бій простоює. */
export function useSpellBookPrefetch() {
  const { campaignId, hero, isDM } = useBattleScene();

  usePrefetchSpellsByIds(campaignId, isDM ? NO_SPELLS : (hero?.spellcasting.knownSpells ?? NO_SPELLS));
}

export function useSpellBook(caster: BattleParticipant | null, options: { allSpells?: boolean; onDone?: () => void } = {}) {
  const scene = useBattleScene();

  const [state, dispatch] = useReducer(spellFlow, initialSpellFlow);

  const isOpen = state.step !== "closed" && !!caster;

  const library = useSpells(scene.campaignId, { enabled: isOpen && !!options.allSpells });

  const known = useSpellsByIds(scene.campaignId, caster?.spellcasting.knownSpells ?? [], { enabled: isOpen && !options.allSpells });

  const spells = useMemo(() => (options.allSpells ? ((library.data ?? []) as BookSpell[]) : (known.data ?? [])), [options.allSpells, library.data, known.data]);

  const byLevel = useMemo(() => groupSpellsByLevel(spells), [spells]);

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
    setSave: (id: string, v: number) => dispatch({ type: "SET_SAVE", id, value: v }),
    setDamage: (i: number, v: number) => dispatch({ type: "SET_DAMAGE", index: i, value: v }),
    aiDamage: () => state.pick?.diceSlots.forEach((sides, i) => dispatch({ type: "SET_DAMAGE", index: i, value: rollDie(sides) })),
    toSummary: () => dispatch({ type: "TO_SUMMARY" }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };
}
